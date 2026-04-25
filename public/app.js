const app = document.getElementById('app');
const apiBaseCandidates =
  window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? ['/api', '/.netlify/functions/api']
    : ['/.netlify/functions/api', '/api'];
const authSlides = [
  '/assets/slideshow/539492053_1226625859496776_570712597374365970_n.jpg',
  '/assets/slideshow/615975574_1349926167166744_5354237296174063309_n.jpg',
  '/assets/slideshow/627879095_1370056285153732_6498569178634195011_n.jpg',
  '/assets/slideshow/632277178_1370056288487065_6138469109024630108_n-2.jpg',
  '/assets/slideshow/637780915_1379151274244233_3487277656226529075_n-2.jpg',
  '/assets/slideshow/641394914_1381995973959763_4682894063127297022_n.jpg',
  '/assets/slideshow/659710668_1408905907935436_4843610025802191879_n.jpg',
  '/assets/slideshow/669649395_1420951780064182_944096738581337393_n.jpg'
];
const publicCelaviveSlides = [
  '/assets/celavive/481253967_674787744901303_2313318558895739560_n.jpg',
  '/assets/celavive/482005834_674343478279063_1722624988872463698_n.jpg',
  '/assets/celavive/494947896_718137260566351_2182410837612406101_n.jpg',
  '/assets/celavive/520140649_774941514885925_9215304103495441476_n.jpg',
  '/assets/celavive/539562242_804686085244801_8541968841010466011_n.jpg',
  '/assets/celavive/557640135_837039312009478_6143742350851462938_n.jpg',
  '/assets/celavive/584341713_873201568393252_5485360468649937889_n.jpg'
];

const state = {
  activeApiBase: apiBaseCandidates[0],
  config: null,
  session: null,
  authSlideshowTimer: null,
  publicSlideshowTimer: null,
  cachedEventCount: null,
  confirmDialog: null,
  headerTitleResizeHandler: null
};

document.addEventListener('click', handleGlobalClick);
document.addEventListener('keydown', handleGlobalKeydown);
window.addEventListener('popstate', () => {
  void renderRoute();
});

void bootstrap();

async function bootstrap() {
  await Promise.all([loadConfig(), refreshSession()]);
  await renderRoute();
}

async function loadConfig() {
  try {
    const response = await apiFetch('/config');
    state.config = await response.json();
  } catch (error) {
    state.config = {
      eventName: 'Celavive Spa Party',
      eventTypes: ['OPP', 'Celavive Spa Party'],
      professions: [],
      googleSheetsConfigured: false
    };
  }
}

async function refreshSession() {
  try {
    const response = await apiFetch('/auth/session');
    const result = await response.json();
    state.session = result.authenticated ? result.user : null;
  } catch (error) {
    state.session = null;
  }
}

async function renderRoute() {
  const pathname = normalizePath(window.location.pathname);

  if (state.publicSlideshowTimer) {
    window.clearInterval(state.publicSlideshowTimer);
    state.publicSlideshowTimer = null;
  }

  if (state.headerTitleResizeHandler) {
    window.removeEventListener('resize', state.headerTitleResizeHandler);
    state.headerTitleResizeHandler = null;
  }

  if (pathname === '/') {
    if (state.session) {
      navigate('/dashboard', true);
      return;
    }

    renderPage(renderAuthPage('login'));
    attachLoginHandlers();
    return;
  }

  if (pathname === '/login') {
    renderPage(renderAuthPage('login'));
    attachLoginHandlers();
    return;
  }

  if (pathname === '/signup') {
    renderPage(renderAuthPage('signup'));
    attachSignupHandlers();
    return;
  }

  if (pathname === '/forgot-password') {
    renderPage(renderForgotPasswordPage());
    attachForgotPasswordHandlers();
    return;
  }

  const resetPasswordMatch = pathname.match(/^\/reset-password\/([^/]+)$/);

  if (resetPasswordMatch) {
    renderPage(renderResetPasswordPage(resetPasswordMatch[1]));
    attachResetPasswordHandlers(resetPasswordMatch[1]);
    return;
  }

  if (pathname === '/dashboard') {
    if (!(await guardAuthenticated())) {
      return;
    }

    renderLoading('Loading your events...', {
      admin: {
        activeView: 'dashboard',
        title: 'Events workspace',
        subtitle: 'Preparing your live workspace and selected event controls.',
        badge: 'Operations console'
      }
    });
    attachAdminShellHandlers();

    try {
      const result = await fetchJson('/events');
      state.cachedEventCount = getActiveWorkspaceEvents(result.events).length;
      renderPage(renderDashboardPage(result.user, result.events));
      attachAdminShellHandlers();
      attachDashboardHandlers(result.events);
    } catch (error) {
      renderPage(renderErrorPage('Unable to load your dashboard.', error.message));
    }

    return;
  }

  if (pathname === '/events/archive') {
    if (!(await guardAuthenticated())) {
      return;
    }

    renderLoading('Loading archived events...', {
      admin: {
        activeView: 'archive',
        title: 'Loading archive',
        subtitle: 'Pulling your completed and archived event history.',
        badge: 'Archive'
      }
    });
    attachAdminShellHandlers();

    try {
      const result = await fetchJson('/events');
      state.cachedEventCount = getActiveWorkspaceEvents(result.events).length;
      renderPage(renderArchivePage(result.events));
      attachAdminShellHandlers();
    } catch (error) {
      renderPage(renderErrorPage('Unable to load your archive.', error.message));
    }

    return;
  }

  if (pathname === '/events/new') {
    if (!(await guardAuthenticated())) {
      return;
    }

    renderPage(renderCreateEventPage());
    attachAdminShellHandlers();
    attachCreateEventHandlers();
    return;
  }

  if (pathname === '/account/password') {
    if (!(await guardAuthenticated())) {
      return;
    }

    navigate('/dashboard', true);
    return;
  }

  const eventDetailMatch = pathname.match(/^\/events\/([^/]+)$/);

  if (eventDetailMatch) {
    if (!(await guardAuthenticated())) {
      return;
    }

    renderLoading('Loading event details...', {
      admin: {
        activeView: 'dashboard',
        title: 'Loading event',
        subtitle: 'Pulling links, QR access, and response tools for this event.',
        badge: 'Event workspace'
      }
    });
    attachAdminShellHandlers();

    try {
      const eventId = eventDetailMatch[1];
      const [eventResult, rsvpResult, attendanceResult] = await Promise.all([
        fetchJson(`/events/${eventId}`),
        fetchJson(`/events/${eventId}/rsvp-responses`),
        fetchJson(`/events/${eventId}/attendance-responses`)
      ]);
      renderPage(renderEventDetailPage(eventResult.event, {
        rsvpResponses: rsvpResult.responses || [],
        attendanceResponses: attendanceResult.responses || []
      }));
      attachAdminShellHandlers();
      attachEventDetailHandlers(eventResult.event);
    } catch (error) {
      renderPage(renderErrorPage('Unable to load that event.', error.message));
    }

    return;
  }

  const rsvpResponseMatch = pathname.match(/^\/events\/([^/]+)\/rsvp-responses$/);

  if (rsvpResponseMatch) {
    if (!(await guardAuthenticated())) {
      return;
    }

    renderLoading('Loading RSVP responses...', {
      admin: {
        activeView: 'dashboard',
        title: 'Loading RSVP responses',
        subtitle: 'Preparing the attendee confirmation table for review.',
        badge: 'Responses'
      }
    });
    attachAdminShellHandlers();

    try {
      const result = await fetchJson(`/events/${rsvpResponseMatch[1]}/rsvp-responses`);
      renderPage(renderResponsesPage('RSVP Responses', result.event, result.responses, 'rsvp'));
      attachAdminShellHandlers();
    } catch (error) {
      renderPage(renderErrorPage('Unable to load RSVP responses.', error.message));
    }

    return;
  }

  const attendanceResponseMatch = pathname.match(/^\/events\/([^/]+)\/attendance-responses$/);

  if (attendanceResponseMatch) {
    if (!(await guardAuthenticated())) {
      return;
    }

    renderLoading('Loading attendance responses...', {
      admin: {
        activeView: 'dashboard',
        title: 'Loading attendance responses',
        subtitle: 'Preparing the on-site registration table for review.',
        badge: 'Responses'
      }
    });
    attachAdminShellHandlers();

    try {
      const result = await fetchJson(`/events/${attendanceResponseMatch[1]}/attendance-responses`);
      renderPage(renderResponsesPage('Attendance Responses', result.event, result.responses, 'attendance'));
      attachAdminShellHandlers();
    } catch (error) {
      renderPage(renderErrorPage('Unable to load attendance responses.', error.message));
    }

    return;
  }

  const rsvpMatch = pathname.match(/^\/rsvp\/([^/]+)$/);

  if (rsvpMatch) {
    renderLoading('Loading RSVP form...');

    try {
      const result = await fetchJson(`/public-events/${rsvpMatch[1]}`);
      renderPage(renderPublicEventPage('rsvp', result.event));
      attachPublicShowcase();
      syncDynamicHeaderTitle();
      attachRsvpHandlers(result.event);
    } catch (error) {
      renderPage(renderErrorPage('Unable to load that RSVP page.', error.message));
    }

    return;
  }

  const attendanceMatch = pathname.match(/^\/attendance\/([^/]+)$/);

  if (attendanceMatch) {
    renderLoading('Loading attendance form...');

    try {
      const result = await fetchJson(`/public-events/${attendanceMatch[1]}`);
      renderPage(renderPublicEventPage('attendance', result.event));
      attachPublicShowcase();
      syncDynamicHeaderTitle();
      attachAttendanceHandlers(result.event);
    } catch (error) {
      renderPage(renderErrorPage('Unable to load that attendance page.', error.message));
    }

    return;
  }

  renderPage(renderErrorPage('Page not found.', 'The page you requested does not exist.'));
}

async function guardAuthenticated() {
  if (state.session) {
    return true;
  }

  await refreshSession();

  if (state.session) {
    return true;
  }

  navigate('/login', true);
  return false;
}

function handleGlobalClick(event) {
  const confirmAccept = event.target.closest('[data-confirm-accept]');

  if (confirmAccept) {
    event.preventDefault();
    resolveConfirmModal(true);
    return;
  }

  const confirmCancel = event.target.closest('[data-confirm-cancel]');

  if (confirmCancel) {
    event.preventDefault();
    resolveConfirmModal(false);
    return;
  }

  const confirmBackdrop = event.target.closest('[data-confirm-backdrop]');

  if (confirmBackdrop && !event.target.closest('[data-confirm-surface]')) {
    event.preventDefault();
    resolveConfirmModal(false);
    return;
  }

  const link = event.target.closest('[data-link]');

  if (link) {
    event.preventDefault();
    navigate(link.getAttribute('href'));
    return;
  }

  const passwordToggle = event.target.closest('[data-password-toggle]');

  if (passwordToggle) {
    event.preventDefault();
    togglePasswordVisibility(passwordToggle);
    return;
  }

  const logoutButton = event.target.closest('[data-logout]');

  if (logoutButton) {
    event.preventDefault();
    void logout();
    return;
  }

  const profileToggle = event.target.closest('[data-profile-toggle]');

  if (profileToggle) {
    event.preventDefault();
    toggleProfilePopover();
    return;
  }

  const profileChange = event.target.closest('[data-profile-change]');

  if (profileChange) {
    event.preventDefault();
    showPasswordForm();
    return;
  }

  const profileBack = event.target.closest('[data-profile-back]');

  if (profileBack) {
    event.preventDefault();
    const popover = document.getElementById('profilePopover');
    const isMenuBackAction =
      profileBack.classList.contains('profile-popover-back-action') &&
      (!popover || popover.dataset.view === 'menu');

    if (isMenuBackAction) {
      closeProfilePopover();
    } else {
      showProfileMenu();
    }
    return;
  }

  const pickerButton = event.target.closest('[data-show-picker]');

  if (pickerButton) {
    event.preventDefault();
    showNativePicker(pickerButton);
    return;
  }

  closeProfilePopoverIfOutside(event.target);
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape') {
    const rsvpSettingsModal = document.getElementById('rsvpSettingsModal');

    if (rsvpSettingsModal && !rsvpSettingsModal.hidden) {
      closeRsvpSettingsModal();
      return;
    }

    if (resolveConfirmModal(false)) {
      return;
    }

    closeProfilePopover();
  }
}

function showConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default'
}) {
  const modal = ensureConfirmModal();

  modal.dataset.tone = tone;
  modal.querySelector('[data-confirm-title]').textContent = title;
  modal.querySelector('[data-confirm-message]').textContent = message;
  modal.querySelector('[data-confirm-accept]').textContent = confirmLabel;
  modal.querySelector('[data-confirm-cancel]').textContent = cancelLabel;
  modal.hidden = false;

  window.requestAnimationFrame(() => {
    modal.classList.add('is-open');
    const cancelButton = modal.querySelector('[data-confirm-cancel]');

    if (cancelButton) {
      cancelButton.focus();
    }
  });

  return new Promise((resolve) => {
    state.confirmDialog = {
      resolve
    };
  });
}

function resolveConfirmModal(result) {
  const modal = document.getElementById('confirmModal');

  if (!state.confirmDialog || !modal) {
    return false;
  }

  const resolver = state.confirmDialog.resolve;
  state.confirmDialog = null;
  modal.classList.remove('is-open');

  window.setTimeout(() => {
    if (modal && !state.confirmDialog) {
      modal.hidden = true;
    }
  }, 180);

  resolver(Boolean(result));
  return true;
}

function ensureConfirmModal() {
  let modal = document.getElementById('confirmModal');

  if (modal) {
    return modal;
  }

  modal = document.createElement('div');
  modal.id = 'confirmModal';
  modal.className = 'confirm-modal';
  modal.hidden = true;
  modal.setAttribute('data-confirm-backdrop', '');
  modal.innerHTML = `
    <div class="confirm-modal-surface" data-confirm-surface role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
      <div class="confirm-modal-kicker">Confirm action</div>
      <h2 id="confirmModalTitle" data-confirm-title></h2>
      <p data-confirm-message></p>
      <div class="confirm-modal-actions">
        <button type="button" class="button-link button-link-secondary confirm-modal-button" data-confirm-cancel></button>
        <button type="button" class="button-link confirm-modal-button" data-confirm-accept></button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function attachLoginHandlers() {
  attachAuthShowcase();
  const form = document.getElementById('authForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('authStatus');
    const submitButton = form.querySelector('button[type="submit"]');

    setStatus(status, '', '');

    try {
      setButtonLoading(submitButton, true, 'Signing in...');
      await fetchJson('/auth/login', {
        method: 'POST',
        body: {
          emailAddress: form.emailAddress.value,
          password: form.password.value
        }
      });

      await refreshSession();
      navigate('/dashboard', true);
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, 'Sign In');
    }
  });
}

function attachForgotPasswordHandlers() {
  attachAuthShowcase();
  const form = document.getElementById('forgotPasswordRequestForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('forgotPasswordRequestStatus');
    const submitButton = form.querySelector('button[type="submit"]');

    setStatus(status, '', '');

    try {
      setButtonLoading(submitButton, true, 'Sending recovery link...');
      const response = await fetchJson('/auth/forgot-password', {
        method: 'POST',
        body: {
          emailAddress: form.emailAddress.value
        }
      });

      setStatus(status, response.message, 'is-success');
      form.reset();
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, 'Send recovery link');
    }
  });
}

function attachSignupHandlers() {
  attachAuthShowcase();
  const form = document.getElementById('authForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('authStatus');
    const submitButton = form.querySelector('button[type="submit"]');

    setStatus(status, '', '');

    try {
      setButtonLoading(submitButton, true, 'Creating account...');
      await fetchJson('/auth/signup', {
        method: 'POST',
        body: {
          fullName: form.fullName.value,
          emailAddress: form.emailAddress.value,
          password: form.password.value
        }
      });

      await refreshSession();
      navigate('/dashboard', true);
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, 'Create Account');
    }
  });
}

function attachResetPasswordHandlers(token) {
  const form = document.getElementById('resetPasswordForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('resetPasswordStatus');
    const submitButton = form.querySelector('button[type="submit"]');
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    setStatus(status, '', '');

    if (newPassword.length < 8) {
      setStatus(status, 'Password must be at least 8 characters.', 'is-error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus(status, 'New password and confirmation do not match.', 'is-error');
      return;
    }

    try {
      setButtonLoading(submitButton, true, 'Saving new password...');
      await fetchJson('/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          newPassword
        }
      });

      setStatus(status, 'Password updated. You can sign in now.', 'is-success');
      form.reset();
      window.setTimeout(() => {
        navigate('/login', true);
      }, 900);
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, 'Update password');
    }
  });
}

function attachDashboardHandlers(events) {
  const activeEvents = getActiveWorkspaceEvents(events);
  const createButton = document.getElementById('createEventButton');
  const manageButton = document.getElementById('manageSelectedEventButton');
  const eventSelect = document.getElementById('dashboardEventSelect');
  const quickPanel = document.getElementById('selectedEventQuickPanel');
  const eventsById = new Map(activeEvents.map((eventData) => [eventData.eventId, eventData]));

  if (createButton) {
    createButton.addEventListener('click', () => {
      navigate('/events/new');
    });
  }

  if (manageButton && eventSelect) {
    const syncDashboardSelection = () => {
      const selectedEvent = eventSelect.value ? eventsById.get(eventSelect.value) : null;
      manageButton.disabled = !selectedEvent;

      if (quickPanel) {
        quickPanel.innerHTML = renderSelectedEventQuickPanel(selectedEvent);
      }
    };

    eventSelect.addEventListener('change', syncDashboardSelection);
    manageButton.addEventListener('click', () => {
      if (eventSelect.value) {
        navigate(`/events/${encodeURIComponent(eventSelect.value)}`);
      }
    });
    syncDashboardSelection();
  }
}

function attachAdminShellHandlers() {
  const form = document.getElementById('changePasswordForm');

  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('changePasswordStatus');
    const submitButton = form.querySelector('button[type="submit"]');
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    setStatus(status, '', '');

    if (newPassword.length < 8) {
      setStatus(status, 'Password must be at least 8 characters.', 'is-error');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus(status, 'New password and confirmation do not match.', 'is-error');
      return;
    }

    try {
      setButtonLoading(submitButton, true, 'Saving...');
      await fetchJson('/auth/change-password', {
        method: 'POST',
        body: {
          currentPassword,
          newPassword
        }
      });

      form.reset();
      setStatus(status, 'Password updated.', 'is-success');
      window.setTimeout(() => {
        closeProfilePopover();
      }, 700);
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, 'Update Password');
    }
  });
}

function attachCreateEventHandlers() {
  const form = document.getElementById('eventForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const status = document.getElementById('eventStatus');

    setStatus(status, '', '');

    try {
      setButtonLoading(submitButton, true, 'Creating event...');
      const result = await fetchJson('/events', {
        method: 'POST',
        body: {
          eventType: form.eventType.value,
          location: form.location.value,
          dateTime: form.dateTime.value
        }
      });

      navigate(`/events/${result.event.eventId}`, true);
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, 'Create Event');
    }
  });
}

function attachEventDetailHandlers(eventData) {
  syncDynamicHeaderTitle();
  const qrImage = document.getElementById('qrImage');
  const qrOpenLink = document.getElementById('qrOpenLink');
  const rsvpUrl = `${window.location.origin}${eventData.rsvpPath}`;

  if (qrImage) {
    qrImage.src = buildQrUrl(rsvpUrl);
    qrImage.alt = `Branded QR code for ${eventData.eventLabel} RSVP`;
  }

  if (qrOpenLink) {
    qrOpenLink.href = buildQrUrl(rsvpUrl);
    qrOpenLink.addEventListener('click', (event) => {
      event.preventDefault();
      openBrandedQrTab(eventData, rsvpUrl);
    });
  }

  const copyButtons = Array.from(document.querySelectorAll('[data-copy-url]'));
  const eventStatus = document.getElementById('eventActionStatus');

  copyButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const url = button.getAttribute('data-copy-url') || '';
      const label = button.getAttribute('data-copy-label') || 'Link';

      try {
        await navigator.clipboard.writeText(url);
        button.classList.remove('is-error');
        button.classList.add('is-copied');
        button.setAttribute('aria-label', `${label} copied`);
        window.setTimeout(() => {
          button.classList.remove('is-copied');
          button.setAttribute('aria-label', `Copy ${label}`);
        }, 1400);

        if (eventStatus) {
          setStatus(eventStatus, '', '');
        }
      } catch (error) {
        button.classList.add('is-error');
        window.setTimeout(() => {
          button.classList.remove('is-error');
        }, 1400);

        if (eventStatus) {
          setStatus(eventStatus, `Unable to copy the ${label.toLowerCase()} on this device.`, 'is-error');
        }
      }
    });
  });

  const scheduleForm = document.getElementById('eventScheduleForm');
  const archiveButton = document.getElementById('toggleArchiveEventButton');
  const deleteButton = document.getElementById('deleteEventButton');
  const rsvpSettingsButton = document.getElementById('openRsvpSettingsButton');
  const rsvpSettingsModal = document.getElementById('rsvpSettingsModal');
  const rsvpSettingsForm = document.getElementById('rsvpSettingsForm');
  const closeRsvpSettingsButtons = Array.from(document.querySelectorAll('[data-close-rsvp-settings]'));
  const managementStatus = document.getElementById('eventManagementStatus');

  if (rsvpSettingsButton && rsvpSettingsModal) {
    rsvpSettingsButton.addEventListener('click', () => {
      rsvpSettingsModal.hidden = false;
      window.requestAnimationFrame(() => {
        rsvpSettingsModal.classList.add('is-open');
        const firstField = rsvpSettingsModal.querySelector('input, button');

        if (firstField) {
          firstField.focus();
        }
      });
    });
  }

  closeRsvpSettingsButtons.forEach((button) => {
    button.addEventListener('click', () => closeRsvpSettingsModal());
  });

  if (rsvpSettingsModal) {
    rsvpSettingsModal.addEventListener('click', (event) => {
      if (event.target === rsvpSettingsModal) {
        closeRsvpSettingsModal();
      }
    });
  }

  if (rsvpSettingsForm) {
    rsvpSettingsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = rsvpSettingsForm.querySelector('button[type="submit"]');
      const status = document.getElementById('rsvpSettingsStatus');
      const acceptingInput = rsvpSettingsForm.querySelector('#rsvpAccepting');
      const maxYesInput = rsvpSettingsForm.querySelector('#rsvpMaxYes');

      setStatus(status, '', '');

      try {
        setButtonLoading(submitButton, true, 'Saving...');
        const result = await fetchJson(`/events/${eventData.eventId}`, {
          method: 'PATCH',
          body: {
            action: 'rsvp-settings',
            rsvpAccepting: Boolean(acceptingInput && acceptingInput.checked),
            rsvpMaxYes: maxYesInput ? maxYesInput.value : ''
          }
        });

        setStatus(status, result.message, 'is-success');
        window.setTimeout(() => {
          closeRsvpSettingsModal();
          navigate(`/events/${encodeURIComponent(result.event.eventId)}`, true);
        }, 500);
      } catch (error) {
        setStatus(status, error.message, 'is-error');
      } finally {
        setButtonLoading(submitButton, false, 'Save Settings');
      }
    });
  }

  if (scheduleForm) {
    scheduleForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = scheduleForm.querySelector('button[type="submit"]');
      const dateTime = scheduleForm.dateTime.value;

      setStatus(managementStatus, '', '');

      try {
        setButtonLoading(submitButton, true, 'Saving schedule...');
        const result = await fetchJson(`/events/${eventData.eventId}`, {
          method: 'PATCH',
          body: {
            action: 'reschedule',
            dateTime
          }
        });

        setStatus(managementStatus, result.message, 'is-success');
        navigate(`/events/${encodeURIComponent(result.event.eventId)}`, true);
      } catch (error) {
        setStatus(managementStatus, error.message, 'is-error');
      } finally {
        setButtonLoading(submitButton, false, 'Update Date');
      }
    });
  }

  if (archiveButton) {
    archiveButton.addEventListener('click', async () => {
      const action = archiveButton.getAttribute('data-event-action') || 'archive';
      const promptMessage =
        action === 'archive'
          ? 'Archive this event and move it out of the active workspace?'
          : 'Move this event back to the active workspace?';

      const confirmed = await showConfirmModal({
        title: action === 'archive' ? 'Archive this event?' : 'Move event to active?',
        message: promptMessage,
        confirmLabel: action === 'archive' ? 'Archive' : 'Move to Active'
      });

      if (!confirmed) {
        return;
      }

      setStatus(managementStatus, '', '');

      try {
        setButtonLoading(archiveButton, true, action === 'archive' ? 'Archiving...' : 'Restoring...');
        const result = await fetchJson(`/events/${eventData.eventId}`, {
          method: 'PATCH',
          body: {
            action
          }
        });

        setStatus(managementStatus, result.message, 'is-success');
        navigate(`/events/${encodeURIComponent(result.event.eventId)}`, true);
      } catch (error) {
        setStatus(managementStatus, error.message, 'is-error');
      } finally {
        setButtonLoading(archiveButton, false, action === 'archive' ? 'Archive Event' : 'Move To Active');
      }
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      const confirmed = await showConfirmModal({
        title: 'Delete this event?',
        message: 'This removes the event from the workspace. Existing RSVP and attendance sheets will remain in Google Sheets.',
        confirmLabel: 'Delete Event',
        tone: 'danger'
      });

      if (!confirmed) {
        return;
      }

      setStatus(managementStatus, '', '');

      try {
        setButtonLoading(deleteButton, true, 'Deleting...');
        const result = await fetchJson(`/events/${eventData.eventId}`, {
          method: 'DELETE'
        });

        setStatus(managementStatus, result.message, 'is-success');
        navigate('/dashboard', true);
      } catch (error) {
        setStatus(managementStatus, error.message, 'is-error');
      } finally {
        setButtonLoading(deleteButton, false, 'Delete Event');
      }
    });
  }
}

function closeRsvpSettingsModal() {
  const modal = document.getElementById('rsvpSettingsModal');

  if (!modal || modal.hidden) {
    return;
  }

  modal.classList.remove('is-open');
  window.setTimeout(() => {
    if (modal.isConnected) {
      modal.hidden = true;
    }
  }, 180);
}

function attachRsvpHandlers(eventData) {
  const form = document.getElementById('publicEventForm');

  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('publicFormStatus');
    const submitButton = form.querySelector('button[type="submit"]');

    setStatus(status, '', '');

    try {
      setButtonLoading(submitButton, true, 'Saving RSVP...');
      const result = await fetchJson(`/events/${eventData.eventId}/rsvp`, {
        method: 'POST',
        body: {
          fullName: form.fullName.value,
          emailAddress: form.emailAddress.value,
          mobileNumber: form.mobileNumber.value,
          profession: form.profession.value,
          invitedBy: form.invitedBy.value,
          attendanceConfirmation: form.attendanceConfirmation.value
        }
      });

      form.reset();
      setStatus(status, result.message, 'is-success');
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, 'Confirm RSVP');
    }
  });
}

function attachAttendanceHandlers(eventData) {
  const form = document.getElementById('publicEventForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('publicFormStatus');
    const submitButton = form.querySelector('button[type="submit"]');

    setStatus(status, '', '');

    try {
      setButtonLoading(submitButton, true, 'Saving attendance...');
      const result = await fetchJson(`/events/${eventData.eventId}/attendance`, {
        method: 'POST',
        body: {
          fullName: form.fullName.value,
          birthday: form.birthday.value,
          mobileNumber: form.mobileNumber.value,
          emailAddress: form.emailAddress.value,
          address: form.address.value,
          profession: form.profession.value
        }
      });

      form.reset();
      setStatus(status, result.message, 'is-success');
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, 'Save Attendance');
    }
  });
}

function attachPublicShowcase() {
  const image = document.getElementById('publicHeroSlideshowImage');
  const dots = document.getElementById('publicHeroSlideshowDots');

  if (!image || !dots || !publicCelaviveSlides.length) {
    return;
  }

  if (state.publicSlideshowTimer) {
    window.clearInterval(state.publicSlideshowTimer);
    state.publicSlideshowTimer = null;
  }

  dots.innerHTML = publicCelaviveSlides
    .map((_, index) => `<span class="public-slideshow-dot${index === 0 ? ' is-active' : ''}"></span>`)
    .join('');

  const dotElements = [...dots.querySelectorAll('.public-slideshow-dot')];
  let currentIndex = 0;

  image.src = publicCelaviveSlides[0];
  image.classList.add('is-visible');

  const staticMobileClosedHero =
    window.matchMedia('(max-width: 720px)').matches &&
    Boolean(document.querySelector('.public-shell-modern.is-rsvp-closed'));

  if (staticMobileClosedHero) {
    dots.innerHTML = '';
    return;
  }

  const syncSlides = () => {
    image.classList.remove('is-visible');

    window.setTimeout(() => {
      image.src = publicCelaviveSlides[currentIndex];
      image.classList.add('is-visible');
      dotElements.forEach((dot, dotIndex) => {
        dot.classList.toggle('is-active', dotIndex === currentIndex);
      });
    }, 120);
  };

  state.publicSlideshowTimer = window.setInterval(() => {
    currentIndex = (currentIndex + 1) % publicCelaviveSlides.length;
    syncSlides();
  }, 3400);
}

async function logout() {
  try {
    await fetchJson('/auth/logout', { method: 'POST', body: {} });
  } catch (error) {
    // Ignore logout API failures and still clear local state.
  }

  state.session = null;
  navigate('/login', true);
}

function renderAuthPage(mode) {
  const isLogin = mode === 'login';
  const authShowcase = renderAuthShowcaseHtml();

  return `
    <div class="auth-page">
      <section class="auth-shell">
        <div class="auth-panel">
          <div class="auth-panel-inner ${isLogin ? 'is-login' : 'is-signup'}">
            <div class="auth-brand">
              <img class="auth-logo" src="/assets/logo/Genesys_Logo2.svg" alt="GeneSys logo">
              <div class="auth-brand-copy">
                <strong>GeneSys</strong>
                <span class="auth-subbrand">Event Admin</span>
              </div>
            </div>
            <div class="auth-copy">
              <h1>${isLogin ? 'Welcome Back' : 'Create Account'}</h1>
              <p class="lede">
                ${isLogin
                  ? 'Enter your email and password to access your event workspace.'
                  : 'Create your account access so you can launch RSVP and attendance pages for every OPP or Celavive event.'}
              </p>
            </div>
            <form id="authForm" class="stack-form auth-form">
              ${
                isLogin
                  ? ''
                  : `
                    <div class="field">
                      <label for="fullName">Full Name <span class="required">*</span></label>
                      <input id="fullName" name="fullName" type="text" autocomplete="name" placeholder="Enter your full name" required>
                    </div>
                  `
              }
              <div class="field">
                <label for="emailAddress">${isLogin ? 'Email' : 'Email Address'} <span class="required">*</span></label>
                <input id="emailAddress" name="emailAddress" type="email" autocomplete="email" placeholder="Enter your email address" required>
              </div>
              <div class="field">
                <label for="password">Password <span class="required">*</span></label>
                <div class="password-input-wrap">
                  <input id="password" name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="${isLogin ? 'Enter your password' : 'Create a password'}" required>
                  <button
                    type="button"
                    class="password-toggle"
                    data-password-toggle
                    data-target="password"
                    aria-label="Show password"
                    aria-pressed="false"
                  >
                    <svg class="icon-eye" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2 12C3.9 7.9 7.4 5.5 12 5.5C16.6 5.5 20.1 7.9 22 12C20.1 16.1 16.6 18.5 12 18.5C7.4 18.5 3.9 16.1 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="12" cy="12" r="3.1" stroke="currentColor" stroke-width="1.8"/>
                    </svg>
                    <svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M10.6 6C11.1 5.8 11.5 5.7 12 5.7C16.4 5.7 19.8 8 21.7 12C20.9 13.8 19.7 15.3 18.3 16.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M14.1 14.3C13.6 14.8 12.8 15.1 12 15.1C10.3 15.1 8.9 13.7 8.9 12C8.9 11.2 9.2 10.4 9.7 9.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M6.1 17.3C4.4 16.1 3 14.4 2.3 12C3 10.5 4 9.2 5.2 8.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
                ${isLogin ? '' : '<div class="helper">Use at least 8 characters.</div>'}
              </div>
              ${
                isLogin
                  ? `
                    <div class="auth-meta-row">
                      <label class="auth-checkbox">
                        <input type="checkbox" name="rememberMe">
                        <span>Remember me</span>
                      </label>
                      <a href="/forgot-password" data-link class="auth-inline-link">
                        Forgot password?
                      </a>
                    </div>
                  `
                  : ''
              }
              <div class="actions stacked">
                <button type="submit">${isLogin ? 'Sign In' : 'Create Account'}</button>
                <div id="authStatus" class="status" aria-live="polite"></div>
              </div>
            </form>
            <div class="auth-foot">
              ${
                isLogin
                  ? 'Need an account? <a href="/signup" data-link>Create one here.</a>'
                  : 'Already have an account? <a href="/login" data-link>Log in here.</a>'
              }
            </div>
            <div class="auth-legal">
              <span>Copyright &copy; 2026 GeneSys Team PH</span>
              <span class="auth-powered">
                <img src="/assets/logo/Renzoned_logo.png" alt="Renzoned logo">
                <span>RenZoned Powered</span>
              </span>
            </div>
          </div>
        </div>
        ${authShowcase}
      </section>
    </div>
  `;
}

function renderForgotPasswordPage() {
  const authShowcase = renderAuthShowcaseHtml();

  return `
    <div class="auth-page">
      <section class="auth-shell">
        <div class="auth-panel">
          <div class="auth-panel-inner is-login">
            <div class="auth-brand">
              <img class="auth-logo" src="/assets/logo/Genesys_Logo2.svg" alt="GeneSys logo">
              <div class="auth-brand-copy">
                <strong>GeneSys</strong>
                <span class="auth-subbrand">Event Admin</span>
              </div>
            </div>
            <div class="auth-copy">
              <h1>Forgot Password</h1>
              <p class="lede">Enter your email address and we&apos;ll send a recovery link if an account exists for it.</p>
            </div>
            <form id="forgotPasswordRequestForm" class="stack-form auth-form auth-recovery-page-form">
              <div class="field">
                <label for="forgotPasswordEmailAddress">Email address <span class="required">*</span></label>
                <input id="forgotPasswordEmailAddress" name="emailAddress" type="email" autocomplete="email" placeholder="Enter your email address" required>
              </div>
              <div class="actions stacked">
                <button type="submit">Send recovery link</button>
                <div id="forgotPasswordRequestStatus" class="status" aria-live="polite"></div>
              </div>
            </form>
            <div class="auth-foot">
              <a href="/login" data-link>Back to sign in</a>
            </div>
            <div class="auth-legal">
              <span>Copyright &copy; 2026 GeneSys Team PH</span>
              <span class="auth-powered">
                <img src="/assets/logo/Renzoned_logo.png" alt="Renzoned logo">
                <span>RenZoned Powered</span>
              </span>
            </div>
          </div>
        </div>
        ${authShowcase}
      </section>
    </div>
  `;
}

function renderResetPasswordPage(token) {
  const authShowcase = renderAuthShowcaseHtml();

  return `
    <div class="auth-page">
      <section class="auth-shell">
        <div class="auth-panel">
          <div class="auth-panel-inner is-login">
            <div class="auth-brand">
              <img class="auth-logo" src="/assets/logo/Genesys_Logo2.svg" alt="GeneSys logo">
              <div class="auth-brand-copy">
                <strong>GeneSys</strong>
                <span class="auth-subbrand">Event Admin</span>
              </div>
            </div>
            <div class="auth-copy">
              <h1>Reset Password</h1>
              <p class="lede">Create a new password for your event workspace access.</p>
            </div>
            <form id="resetPasswordForm" class="stack-form auth-form">
              <div class="field">
                <label for="newPassword">New Password <span class="required">*</span></label>
                <div class="password-input-wrap">
                  <input id="newPassword" name="newPassword" type="password" autocomplete="new-password" placeholder="Create a new password" required>
                  <button
                    type="button"
                    class="password-toggle"
                    data-password-toggle
                    data-target="newPassword"
                    aria-label="Show password"
                    aria-pressed="false"
                  >
                    <svg class="icon-eye" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2 12C3.9 7.9 7.4 5.5 12 5.5C16.6 5.5 20.1 7.9 22 12C20.1 16.1 16.6 18.5 12 18.5C7.4 18.5 3.9 16.1 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="12" cy="12" r="3.1" stroke="currentColor" stroke-width="1.8"/>
                    </svg>
                    <svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M10.6 6C11.1 5.8 11.5 5.7 12 5.7C16.4 5.7 19.8 8 21.7 12C20.9 13.8 19.7 15.3 18.3 16.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M14.1 14.3C13.6 14.8 12.8 15.1 12 15.1C10.3 15.1 8.9 13.7 8.9 12C8.9 11.2 9.2 10.4 9.7 9.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M6.1 17.3C4.4 16.1 3 14.4 2.3 12C3 10.5 4 9.2 5.2 8.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="field">
                <label for="confirmPassword">Confirm Password <span class="required">*</span></label>
                <div class="password-input-wrap">
                  <input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" placeholder="Confirm your new password" required>
                  <button
                    type="button"
                    class="password-toggle"
                    data-password-toggle
                    data-target="confirmPassword"
                    aria-label="Show password"
                    aria-pressed="false"
                  >
                    <svg class="icon-eye" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2 12C3.9 7.9 7.4 5.5 12 5.5C16.6 5.5 20.1 7.9 22 12C20.1 16.1 16.6 18.5 12 18.5C7.4 18.5 3.9 16.1 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="12" cy="12" r="3.1" stroke="currentColor" stroke-width="1.8"/>
                    </svg>
                    <svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M10.6 6C11.1 5.8 11.5 5.7 12 5.7C16.4 5.7 19.8 8 21.7 12C20.9 13.8 19.7 15.3 18.3 16.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M14.1 14.3C13.6 14.8 12.8 15.1 12 15.1C10.3 15.1 8.9 13.7 8.9 12C8.9 11.2 9.2 10.4 9.7 9.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M6.1 17.3C4.4 16.1 3 14.4 2.3 12C3 10.5 4 9.2 5.2 8.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
                <div class="helper">Use at least 8 characters.</div>
              </div>
              <div class="actions stacked">
                <button type="submit">Update password</button>
                <div id="resetPasswordStatus" class="status" aria-live="polite"></div>
              </div>
            </form>
            <div class="auth-foot">
              <a href="/login" data-link>Back to login</a>
            </div>
            <div class="auth-legal">
              <span>Copyright &copy; 2026 GeneSys Team PH</span>
              <span class="auth-powered">
                <img src="/assets/logo/Renzoned_logo.png" alt="Renzoned logo">
                <span>RenZoned Powered</span>
              </span>
            </div>
          </div>
        </div>
        ${authShowcase}
      </section>
    </div>
  `;
}

function renderAuthShowcaseHtml() {
  if (window.matchMedia('(max-width: 940px)').matches) {
    return '';
  }

  return `
    <aside class="auth-showcase">
      <div class="auth-showcase-frame">
        <img id="authSlideshowImage" class="auth-showcase-image" src="${authSlides[0]}" alt="Celavive event slideshow">
        <div class="auth-showcase-overlay">
          <div></div>
          <div id="authSlideshowDots" class="auth-slideshow-dots" aria-hidden="true"></div>
        </div>
      </div>
    </aside>
  `;
}

function renderPoweredFooter(footerClass = 'auth-legal') {
  return `
    <div class="${escapeAttribute(footerClass)}">
      <span>Copyright &copy; 2026 GeneSys Team PH</span>
      <span class="auth-powered">
        <img src="/assets/logo/Renzoned_logo.png" alt="Renzoned logo">
        <span>RenZoned Powered</span>
      </span>
    </div>
  `;
}

function attachAuthShowcase() {
  const image = document.getElementById('authSlideshowImage');
  const dots = document.getElementById('authSlideshowDots');

  if (state.authSlideshowTimer) {
    clearInterval(state.authSlideshowTimer);
    state.authSlideshowTimer = null;
  }

  if (!image || !dots || !authSlides.length) {
    return;
  }

  let activeIndex = 0;
  dots.innerHTML = authSlides
    .map((_, index) => `<span class="auth-slideshow-dot${index === 0 ? ' is-active' : ''}"></span>`)
    .join('');

  const dotElements = [...dots.querySelectorAll('.auth-slideshow-dot')];

  const renderSlide = () => {
    image.classList.remove('is-visible');

    window.setTimeout(() => {
      image.src = authSlides[activeIndex];
      image.classList.add('is-visible');
      dotElements.forEach((dot, index) => {
        dot.classList.toggle('is-active', index === activeIndex);
      });
    }, 120);
  };

  image.classList.add('is-visible');

  state.authSlideshowTimer = window.setInterval(() => {
    activeIndex = (activeIndex + 1) % authSlides.length;
    renderSlide();
  }, 3600);
}

function togglePasswordVisibility(button) {
  const targetId = button.getAttribute('data-target');
  const input = targetId ? document.getElementById(targetId) : null;

  if (!input) {
    return;
  }

  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  button.classList.toggle('is-visible', isHidden);
  button.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
  button.setAttribute('aria-pressed', String(isHidden));
}

function showNativePicker(button) {
  const targetId = button.getAttribute('data-target');
  const input = targetId ? document.getElementById(targetId) : null;

  if (!input) {
    return;
  }

  input.focus();

  if (typeof input.showPicker === 'function') {
    input.showPicker();
  } else {
    input.click();
  }
}

function renderDashboardPage(user, events) {
  const activeEvents = getActiveWorkspaceEvents(events);
  const summary = summarizeEvents(activeEvents);
  const selectedEvent = getPrimaryEvent(activeEvents);

  return renderAdminFrame({
    activeView: 'dashboard',
    user,
    eventCount: activeEvents.length,
    title: 'Events workspace',
    subtitle: 'Track RSVP collection, attendance capture, QR sharing, and response review from one polished workspace.',
    badge: 'Operations console',
    headerControls: `
      <div class="dashboard-control-group">
        <label class="dashboard-select-wrap" for="dashboardEventSelect">
          <select id="dashboardEventSelect" class="dashboard-event-select" ${activeEvents.length ? '' : 'disabled'}>
            ${
              activeEvents.length
                ? activeEvents
                    .map(
                      (eventData) => `
                        <option value="${escapeAttribute(eventData.eventId)}"${selectedEvent && selectedEvent.eventId === eventData.eventId ? ' selected' : ''}>
                          ${escapeHtml(eventData.eventLabel)}
                        </option>
                      `
                    )
                    .join('')
                : '<option value="">No active events available</option>'
            }
          </select>
        </label>
        <button id="manageSelectedEventButton" type="button" class="button-link button-link-secondary" ${activeEvents.length ? '' : 'disabled'}>
          <span class="dashboard-action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 3V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M17 3V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M4 9H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" stroke-width="1.8"/>
            </svg>
          </span>
          <span>Manage Event</span>
        </button>
        <button id="createEventButton" type="button" class="topbar-primary">
          <span class="dashboard-action-icon dashboard-action-icon-plus" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
          <span>Create Event</span>
        </button>
      </div>
    `,
    content: `
      <section class="dashboard-grid">
        <div class="dashboard-main">
          <div class="workspace-panel dashboard-overview-card">
            <div class="dashboard-overview-head">
              <span class="section-kicker">Workspace snapshot</span>
              <span class="dashboard-overview-hint">Swipe to view all</span>
            </div>
            <div class="dashboard-overview-grid">
              ${renderSummaryCard('Total Events', String(summary.totalEvents), 'Live workspace volume', 'is-dark')}
              ${renderSummaryCard('Upcoming', summary.upcomingDate, summary.upcomingLabel, 'is-accent')}
              ${renderSummaryCard('Event Types', String(summary.uniqueEventTypes), 'Distinct programs scheduled', 'is-muted')}
              ${renderSummaryCard('Public Forms', String(summary.formsPublished), 'RSVP and attendance pages ready', 'is-soft')}
            </div>
          </div>
        </div>

        <aside class="dashboard-side">
          <section class="workspace-panel quick-panel">
            <span class="section-kicker">Workflow pulse</span>
            <h3>${escapeHtml(summary.highlightTitle)}</h3>
            <p>${escapeHtml(summary.highlightText)}</p>
            <div class="quick-panel-stat">
              <strong>${escapeHtml(summary.highlightValue)}</strong>
              <span>${escapeHtml(summary.highlightCaption)}</span>
            </div>
          </section>

          <section class="workspace-panel selected-event-panel">
            <div id="selectedEventQuickPanel">
              ${renderSelectedEventQuickPanel(selectedEvent)}
            </div>
          </section>
        </aside>
      </section>
    `
  });
}

function renderArchivePage(events) {
  const archivedEvents = getArchiveEvents(events);

  return renderAdminFrame({
    activeView: 'archive',
    user: state.session,
    eventCount: getActiveWorkspaceEvents(events).length,
    title: 'Archive',
    subtitle: 'Review completed events, manually archived schedules, and older workspaces that are no longer active.',
    badge: 'Event history',
    headerControls: renderHeaderBackLink('/dashboard', 'Back to dashboard'),
    content: `
      <section class="workspace-panel workspace-panel-large archive-panel">
        <div class="workspace-heading archive-heading">
          <div>
            <span class="section-kicker">Completed events</span>
            <h2>Past and archived events</h2>
            <p>These events are out of the live workspace. Open any event to review its details and response history.</p>
          </div>
          <div class="response-meta-pill">${archivedEvents.length} event${archivedEvents.length === 1 ? '' : 's'}</div>
        </div>
        ${
          archivedEvents.length
            ? `
              <div class="archive-grid">
                ${archivedEvents.map((eventData) => renderArchiveEventCard(eventData)).join('')}
              </div>
            `
            : `
              <div class="empty-state empty-state-modern archive-empty-state">
                <strong>No archived events yet.</strong>
                <span>Past events and manually archived schedules will appear here automatically.</span>
              </div>
            `
        }
      </section>
    `
  });
}

function renderCreateEventPage() {
  return renderAdminFrame({
    activeView: 'create',
    user: state.session,
    title: 'Create a new event',
    subtitle: 'Set the event type, venue, and schedule to instantly publish RSVP and attendance workflows.',
    badge: 'New scenario',
    headerControls: renderHeaderBackLink('/dashboard', 'Back to dashboard'),
    content: `
      <section class="editor-grid">
        <section class="workspace-panel workspace-panel-large form-workspace">
          <div class="workspace-heading">
            <div>
              <span class="section-kicker">Event setup</span>
              <h2>Event details</h2>
              <p>Everything below is used to generate the event label, the RSVP page, the attendance page, and the linked sheets.</p>
            </div>
          </div>

          <form id="eventForm" class="stack-form modern-form create-event-form">
            <div class="grid create-event-fields">
              <div class="field">
                <label for="eventType">Event Type <span class="required">*</span></label>
                <select id="eventType" name="eventType" required>
                  <option value="">Select event type</option>
                  ${state.config.eventTypes.map((type) => `<option value="${escapeAttribute(type)}">${escapeHtml(type)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="dateTime">Date and Time <span class="required">*</span></label>
                <div class="date-input-shell">
                  <input id="dateTime" name="dateTime" type="datetime-local" data-mobile-picker required>
                  <button type="button" class="date-input-shell-button" data-show-picker data-target="dateTime" aria-label="Open date and time picker">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M7 3V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M17 3V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M4 9H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" stroke-width="1.8"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="field full">
              <label for="location">Location <span class="required">*</span></label>
              <textarea id="location" name="location" placeholder="Boardroom 3, 8th Floor, Mallberry Suites, Cagayan de Oro City" required></textarea>
            </div>
            <div class="form-submit-row">
              <button type="submit">Create Event</button>
              <div id="eventStatus" class="status" aria-live="polite"></div>
            </div>
          </form>
        </section>

        <aside class="workspace-panel form-guide">
          <span class="section-kicker">Publishing notes</span>
          <h3>What gets created</h3>
          <ul class="bullet-list">
            <li>An RSVP page for invite confirmation.</li>
            <li>An attendance page for on-site registration.</li>
            <li>Dedicated Google Sheet tabs for each workflow.</li>
          </ul>
        </aside>
      </section>
    `
  });
}

function renderEventDetailPage(eventData, previews = {}) {
  const rsvpUrl = `${window.location.origin}${eventData.rsvpPath}`;
  const attendanceUrl = `${window.location.origin}${eventData.attendancePath}`;
  const rsvpCount = (previews.rsvpResponses || []).length;
  const attendanceCount = (previews.attendanceResponses || []).length;
  const rsvpPreviewRows = buildResponsePreviewRows(previews.rsvpResponses || [], 'rsvp');
  const attendancePreviewRows = buildResponsePreviewRows(previews.attendanceResponses || [], 'attendance');

  return renderAdminFrame({
    activeView: eventData.isArchived ? 'archive' : 'dashboard',
    user: state.session,
    title: eventData.eventType,
    titleClass: eventData.isArchived ? '' : 'admin-title-dynamic',
    subtitle: eventData.isArchived
      ? 'Review this completed event and its published response history.'
      : 'Share RSVP, capture attendance, and review responses from one event workspace.',
    badge: eventData.isArchived ? eventData.eventType : 'Event',
    headerDetails: eventData.isArchived ? '' : renderEventHeaderControls(eventData),
    headerControls: renderHeaderBackLink(eventData.isArchived ? '/events/archive' : '/dashboard', eventData.isArchived ? 'Back to archive' : 'Back to dashboard'),
    content: `
      <section class="editor-grid event-detail-layout${eventData.isArchived ? ' is-archived' : ' is-active'}">
        <div class="detail-main-stack">
          <section class="workspace-panel workspace-panel-large detail-hero">
            <div class="detail-hero-head">
              <div>
                <span class="section-kicker">Event access</span>
                <h2>Public links and launch actions</h2>
                <p>Use the published links below to invite attendees or register them on-site.</p>
              </div>
              ${
                eventData.isArchived
                  ? ''
                  : `
                    <button id="openRsvpSettingsButton" type="button" class="button-link button-link-secondary rsvp-settings-open-button">
                      RSVP Settings
                    </button>
                  `
              }
            </div>
            <div class="detail-link-grid">
              <div class="link-stack modern-link-stack">
                <label>RSVP Link</label>
                ${renderEventUrlControl({
                  url: rsvpUrl,
                  openHref: eventData.rsvpPath,
                  copyLabel: 'RSVP link',
                  openLabel: 'Open RSVP'
                })}
              </div>
              <div class="link-stack modern-link-stack">
                <label>Attendance Link</label>
                ${renderEventUrlControl({
                  url: attendanceUrl,
                  openHref: eventData.attendancePath,
                  copyLabel: 'attendance link',
                  openLabel: 'Open attendance'
                })}
              </div>
            </div>
            <div id="eventActionStatus" class="status event-link-status" aria-live="polite"></div>
            <div class="event-link-grid detail-response-grid detail-response-grid-inline">
              <a href="/events/${encodeURIComponent(eventData.eventId)}/rsvp-responses" data-link class="action-card action-card-strong">
                <div class="detail-response-card-head">
                  <strong>View all RSVP responses</strong>
                  <span class="detail-response-count">${(previews.rsvpResponses || []).length}</span>
                </div>
                <span>Latest 3 confirmations from the RSVP sheet.</span>
                ${renderResponsePreviewList(rsvpPreviewRows, 'rsvp')}
              </a>
              <a href="/events/${encodeURIComponent(eventData.eventId)}/attendance-responses" data-link class="action-card">
                <div class="detail-response-card-head">
                  <strong>View all attendance responses</strong>
                  <span class="detail-response-count">${(previews.attendanceResponses || []).length}</span>
                </div>
                <span>Latest 3 registrations from the attendance sheet.</span>
                ${renderResponsePreviewList(attendancePreviewRows, 'attendance')}
              </a>
            </div>
          </section>
        </div>

        <aside class="detail-side-stack">
          <section class="workspace-panel qr-card${eventData.isArchived ? '' : ' qr-card-active'}">
            <span class="section-kicker">QR access</span>
            <h3>RSVP QR code</h3>
            <p>Share this QR with potential attendees so they can confirm attendance quickly.</p>
            <div class="qr-panel">
              <div class="qr-image-stack">
                <img id="qrImage" class="qr-image" alt="RSVP QR code">
                <img class="qr-brand-mark" src="/assets/logo/Genesys_Logo2.svg" alt="" aria-hidden="true">
              </div>
            </div>
            <a id="qrOpenLink" class="button-link button-link-secondary" target="_blank" rel="noreferrer" href="${escapeAttribute(buildQrUrl(rsvpUrl))}">Open QR in new tab</a>
          </section>
        </aside>
      </section>
      ${eventData.isArchived ? '' : renderRsvpSettingsModal(eventData)}
    `
  });
}

function renderRsvpSettingsModal(eventData) {
  const availability = eventData.rsvpAvailability || {};
  const maxYes = eventData.rsvpMaxYes || availability.maxYes || '';
  const yesCount = Number.isFinite(availability.yesCount) ? availability.yesCount : 0;

  return `
    <div id="rsvpSettingsModal" class="rsvp-settings-modal" hidden>
      <section class="rsvp-settings-surface" role="dialog" aria-modal="true" aria-labelledby="rsvpSettingsTitle">
        <div class="rsvp-settings-head">
          <div>
            <span class="section-kicker">RSVP controls</span>
            <h2 id="rsvpSettingsTitle">RSVP Settings</h2>
            <p>${yesCount} accepted Yes RSVP${yesCount === 1 ? '' : 's'} so far.</p>
          </div>
          <button type="button" class="rsvp-settings-close" data-close-rsvp-settings aria-label="Close RSVP settings">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 7L17 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
              <path d="M17 7L7 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <form id="rsvpSettingsForm" class="rsvp-settings-form">
          <label class="rsvp-toggle-row" for="rsvpAccepting">
            <span>
              <strong>Accept RSVPs</strong>
            </span>
            <input id="rsvpAccepting" name="rsvpAccepting" type="checkbox" ${eventData.rsvpAccepting ? 'checked' : ''}>
            <span class="rsvp-lock-toggle" aria-hidden="true">
              <span class="rsvp-lock rsvp-lock-closed">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="5.5" y="10" width="13" height="10" rx="2.4" stroke="currentColor" stroke-width="1.9"/>
                  <path d="M8.5 10V7.5C8.5 5.6 10 4.1 12 4.1C14 4.1 15.5 5.6 15.5 7.5V10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="rsvp-lock rsvp-lock-open">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="5.5" y="10" width="13" height="10" rx="2.4" stroke="currentColor" stroke-width="1.9"/>
                  <path d="M8.5 10V7.5C8.5 5.6 10 4.1 12 4.1C13.3 4.1 14.4 4.8 15 5.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
                </svg>
              </span>
            </span>
          </label>
          <div class="field">
            <label for="rsvpMaxYes">Max accepted Yes RSVPs</label>
            <input id="rsvpMaxYes" name="rsvpMaxYes" type="number" min="1" step="1" inputmode="numeric" value="${escapeAttribute(maxYes)}" placeholder="Example: 20">
          </div>
          <div id="rsvpSettingsStatus" class="status" aria-live="polite"></div>
          <div class="rsvp-settings-actions">
            <button type="button" class="button-link button-link-secondary" data-close-rsvp-settings>Cancel</button>
            <button type="submit">Save Settings</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderResponsesPage(title, eventData, responses, mode) {
  const columns = getVisibleResponseColumns(mode, responses);

  return renderAdminFrame({
    activeView: eventData.isArchived ? 'archive' : 'dashboard',
    user: state.session,
    title,
    subtitle: `${eventData.eventLabel} · ${responses.length} response${responses.length === 1 ? '' : 's'}`,
    badge: eventData.eventType,
    headerControls: renderHeaderBackLink(`/events/${encodeURIComponent(eventData.eventId)}`, 'Back to event'),
    content: `
      <section class="workspace-panel workspace-panel-large responses-panel${mode === 'rsvp' ? ' responses-panel-rsvp' : ''}">
        <div class="workspace-heading">
          <div>
            <span class="section-kicker">Response log</span>
            <h2>${escapeHtml(title)}</h2>
            <p>Review exported entries exactly as they were captured for this event workflow.</p>
          </div>
          <div class="response-meta-pill">${responses.length} row${responses.length === 1 ? '' : 's'}</div>
        </div>
        ${
          responses.length
            ? `
              ${renderTable(columns, responses)}
              ${mode === 'rsvp' ? renderMobileRsvpResponses(columns, responses) : ''}
            `
            : `
              <div class="empty-state empty-state-modern">
                <strong>No responses yet.</strong>
                <span>This event has not collected any ${mode === 'rsvp' ? 'RSVP' : 'attendance'} entries so far.</span>
              </div>
            `
        }
      </section>
    `
  });
}

function renderHeaderBackLink(href, label) {
  return `
    <a
      href="${escapeAttribute(href)}"
      data-link
      class="button-link button-link-secondary header-back-link"
      aria-label="${escapeAttribute(label)}"
      title="${escapeAttribute(label)}"
    >
      <span class="header-back-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </a>
  `;
}

function renderEventActionIcon(action) {
  if (action === 'external') {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 17L17 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M9 7H17V15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  if (action === 'responses') {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 7.5C6 6.67 6.67 6 7.5 6H16.5C17.33 6 18 6.67 18 7.5V13.5C18 14.33 17.33 15 16.5 15H11L7.25 18V15H7.5C6.67 15 6 14.33 6 13.5V7.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M9 9.5H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M9 12H13.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;
  }

  if (action === 'archive') {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7.5C4 6.7 4.7 6 5.5 6H18.5C19.3 6 20 6.7 20 7.5V9.5C20 10.3 19.3 11 18.5 11H5.5C4.7 11 4 10.3 4 9.5V7.5Z" stroke="currentColor" stroke-width="1.8"/>
        <path d="M6.5 11V17.5C6.5 18.3 7.2 19 8 19H16C16.8 19 17.5 18.3 17.5 17.5V11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M9 14H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;
  }

  if (action === 'delete') {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 7H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M9 7V5.8C9 5.36 9.36 5 9.8 5H14.2C14.64 5 15 5.36 15 5.8V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M7 7L7.8 18.2C7.86 19.02 8.54 19.65 9.36 19.65H14.64C15.46 19.65 16.14 19.02 16.2 18.2L17 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M10 10.5V16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M14 10.5V16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M17 3V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M4 9H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" stroke-width="1.8"/>
      <path d="M8 13H12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M8 16H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `;
}

function renderEventHeaderControls(eventData) {
  return `
    <form id="eventScheduleForm" class="event-header-schedule-form">
      <div class="event-header-schedule-field">
        <label for="manageDateTime">Reschedule event</label>
        <div class="date-input-shell">
          <input id="manageDateTime" name="dateTime" type="datetime-local" data-mobile-picker value="${escapeAttribute(formatDateTimeLocalValue(eventData.dateTime))}" required>
          <button type="button" class="date-input-shell-button" data-show-picker data-target="manageDateTime" aria-label="Open schedule picker">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 3V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M17 3V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M4 9H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" stroke-width="1.8"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="event-header-actions-row">
        <button type="submit" class="event-header-action-button">
          <span class="event-header-action-icon">${renderEventActionIcon('update')}</span>
          <span>Update</span>
        </button>
        <button
          id="toggleArchiveEventButton"
          type="button"
          class="button-link button-link-secondary event-header-action-button"
          data-event-action="archive"
        >
          <span class="event-header-action-icon">${renderEventActionIcon('archive')}</span>
          <span>Archive</span>
        </button>
        <button id="deleteEventButton" type="button" class="button-link button-link-danger event-header-action-button">
          <span class="event-header-action-icon">${renderEventActionIcon('delete')}</span>
          <span>Delete</span>
        </button>
      </div>
      <div id="eventManagementStatus" class="status event-management-status event-header-status" aria-live="polite"></div>
    </form>
  `;
}

function renderEventUrlControl({ url, openHref, copyLabel, openLabel }) {
  return `
    <div class="event-url-control">
      <div class="event-url-field">
        <a href="${escapeAttribute(openHref)}" target="_blank" rel="noreferrer" class="event-url-mini-button event-url-open-button" aria-label="${escapeAttribute(openLabel)}">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 17L17 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M9 7H17V15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <input type="text" readonly value="${escapeAttribute(url)}">
        <button
          type="button"
          class="event-url-mini-button event-url-copy-button"
          data-copy-url="${escapeAttribute(url)}"
          data-copy-label="${escapeAttribute(copyLabel)}"
          aria-label="Copy ${escapeAttribute(copyLabel)}"
        >
          <span class="event-url-copy-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="10" height="10" rx="2.2" stroke="currentColor" stroke-width="1.8"/>
              <path d="M7 15H6.2C5 15 4 14 4 12.8V6.2C4 5 5 4 6.2 4H12.8C14 4 15 5 15 6.2V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="event-url-check-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5.5 12.5L9.5 16.5L18.5 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
      </div>
    </div>
  `;
}

function getRsvpResponseSummary(row) {
  return {
    name: row['Full Name'] || row['Full Name of Attendee'] || 'Unknown attendee',
    invitedBy: row['Invited By'] || row['Name of the person who invited you'] || 'Not provided'
  };
}

function renderMobileRsvpResponses(columns, rows) {
  const detailColumns = columns.filter(
    (column) =>
      column !== 'Full Name' &&
      column !== 'Full Name of Attendee' &&
      column !== 'Invited By' &&
      column !== 'Name of the person who invited you'
  );

  return `
    <div class="mobile-rsvp-response-list" aria-label="Mobile RSVP response list">
      ${rows
        .map((row, index) => {
          const summary = getRsvpResponseSummary(row);

          return `
            <details class="mobile-rsvp-response-card">
              <summary>
                <span class="mobile-rsvp-response-main">
                  <span class="mobile-rsvp-response-name">${escapeHtml(summary.name)}</span>
                  <span class="mobile-rsvp-response-invited">Invited by ${escapeHtml(summary.invitedBy)}</span>
                </span>
                <span class="mobile-rsvp-response-open" aria-label="Open full details for row ${index + 1}">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 12C5.8 8.8 8.5 7.2 12 7.2C15.5 7.2 18.2 8.8 20 12C18.2 15.2 15.5 16.8 12 16.8C8.5 16.8 5.8 15.2 4 12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                    <path d="M12 14.2C13.2 14.2 14.2 13.2 14.2 12C14.2 10.8 13.2 9.8 12 9.8C10.8 9.8 9.8 10.8 9.8 12C9.8 13.2 10.8 14.2 12 14.2Z" stroke="currentColor" stroke-width="1.8"/>
                  </svg>
                </span>
              </summary>
              <dl class="mobile-rsvp-response-details">
                ${detailColumns
                  .map(
                    (column) => `
                      <div>
                        <dt>${escapeHtml(column)}</dt>
                        <dd>${escapeHtml(row[column] || '-')}</dd>
                      </div>
                    `
                  )
                  .join('')}
              </dl>
            </details>
          `;
        })
        .join('')}
    </div>
  `;
}

function buildResponsePreviewRows(responses, mode) {
  return responses.slice(0, 3).map((row) => ({
    name: row['Full Name'] || row['Full Name of Attendee'] || 'Unknown attendee',
    invitedBy:
      mode === 'rsvp'
        ? row['Invited By'] || row['Name of the person who invited you'] || 'Not provided'
        : row['Invited By'] || row['Name of the person who invited you'] || 'Not captured'
  }));
}

function renderResponsePreviewList(rows, mode) {
  if (!rows.length) {
    return `
      <div class="response-preview-list is-empty">
        <div class="response-preview-item">
          <span class="response-preview-name">No ${mode === 'rsvp' ? 'RSVP' : 'attendance'} responses yet</span>
          <span class="response-preview-meta">Preview appears here once responses come in.</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="response-preview-list">
      ${rows
        .map(
          (row) => `
            <div class="response-preview-item">
              <span class="response-preview-line">
                <span class="response-preview-name">${escapeHtml(row.name)}</span>
                <span class="response-preview-meta">Invited by ${escapeHtml(row.invitedBy)}</span>
              </span>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

function getVisibleResponseColumns(mode, responses) {
  const hiddenColumns = new Set([
    '__rowNumber',
    'Timestamp',
    'Event ID',
    'Event Type',
    'Event Label',
    'Location',
    'Date Time'
  ]);
  const fallbackColumns = mode === 'rsvp' ? rsvpColumnFallback() : attendanceColumnFallback();
  const sourceColumns = responses.length ? Object.keys(responses[0]) : fallbackColumns;

  return sourceColumns.filter((column) => !hiddenColumns.has(column));
}

function renderPublicEventPage(mode, eventData) {
  const isRsvp = mode === 'rsvp';
  const title = isRsvp ? `${eventData.eventType} RSVP` : `${eventData.eventType} Attendance`;
  const eventDateTime = eventData.displayDateTime || formatMetricDateTime(eventData.dateTime);
  const availability = eventData.rsvpAvailability || {};
  const rsvpClosed = isRsvp && availability.canAccept === false;
  const lede = isRsvp
    ? 'Let us know if you can make it so your host can finalize the guest list.'
    : 'Complete the form to confirm your arrival and keep your event record accurate.';

  return `
    <div class="page public-page">
      <div class="public-shell-modern${rsvpClosed ? ' is-rsvp-closed' : ''}">
        <section class="public-hero-panel">
          <div class="public-hero-copy">
            <h1 data-dynamic-title>${escapeHtml(title)}</h1>
            <p class="lede">${escapeHtml(lede)}</p>
          </div>
          <div class="public-hero-gallery">
            <div class="public-slideshow-frame">
              ${
                isRsvp && !rsvpClosed
                  ? '<img class="public-slideshow-mark" src="/assets/logo/Genesys_Logo2.svg" alt="">'
                  : ''
              }
              <img id="publicHeroSlideshowImage" class="public-slideshow-image" src="${publicCelaviveSlides[0]}" alt="Celavive event gallery">
              <div class="public-slideshow-overlay">
                <div class="public-slideshow-copy">
                  <span>${escapeHtml(isRsvp ? 'A luminous evening of beauty and connection' : 'A graceful welcome to your event arrival')}</span>
                  <strong>${escapeHtml(eventData.location)}</strong>
                  <em>${escapeHtml(eventDateTime)}</em>
                </div>
                <div id="publicHeroSlideshowDots" class="public-slideshow-dots" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="public-form-shell">
          ${rsvpClosed ? renderPublicRsvpClosedCard(eventData, availability) : renderPublicFormCard(isRsvp)}
        </section>
      </div>
      ${renderPoweredFooter('public-page-footer')}
    </div>
  `;
}

function renderPublicFormCard(isRsvp) {
  return `
    <div class="form-card public-form-card">
      <div class="panel-head">
        <span class="section-kicker">Submission</span>
        <h2>${escapeHtml(isRsvp ? 'Confirm your attendance' : 'Register your attendance details')}</h2>
        <p>${escapeHtml(isRsvp ? 'Reply once so your host can prepare seating, refreshments, and follow-up reminders.' : 'We only ask for the details needed to verify entry and save your attendance in the event sheet.')}</p>
      </div>

      <form id="publicEventForm" class="modern-form">
        ${isRsvp ? renderRsvpFields() : renderAttendanceFields()}
        <div class="form-submit-row">
          <button type="submit">${isRsvp ? 'Confirm RSVP' : 'Save Attendance'}</button>
          <div id="publicFormStatus" class="status" aria-live="polite"></div>
        </div>
      </form>

      <div class="footer-note">
        Your response will be saved to this event&apos;s dedicated Google Sheet tab.
      </div>
    </div>
  `;
}

function renderPublicRsvpClosedCard(eventData, availability) {
  const isFull = availability && availability.reason === 'full';
  const titleHtml = isFull
    ? '<span class="public-closed-title-line">This schedule is</span><span class="public-closed-title-line">fully reserved</span>'
    : '<span class="public-closed-title-line">RSVP is not accepting</span><span class="public-closed-title-line">responses right now</span>';

  return `
    <div class="form-card public-form-card public-closed-card">
      <div class="public-closed-mark" aria-hidden="true">
        <img src="/assets/logo/Genesys_Logo2.svg" alt="">
      </div>
      <span class="section-kicker">${isFull ? 'RSVP list full' : 'RSVP paused'}</span>
      <h2>${titleHtml}</h2>
      <p>
        Thank you for your interest in ${escapeHtml(eventData.eventType)}. Please contact your host for the next available schedule.
      </p>
      <div class="public-closed-event">
        <strong>${escapeHtml(eventData.location)}</strong>
        <span>${escapeHtml(eventData.displayDateTime || formatMetricDateTime(eventData.dateTime))}</span>
      </div>
    </div>
  `;
}

function renderRsvpFields() {
  return `
    <div class="grid">
      <div class="field full">
        <label for="fullName">Full Name of Attendee <span class="required">*</span></label>
        <input id="fullName" name="fullName" type="text" autocomplete="name" required>
      </div>
      <div class="field">
        <label for="emailAddress">Email Address <span class="required">*</span></label>
        <input id="emailAddress" name="emailAddress" type="email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="mobileNumber">Mobile Number <span class="required">*</span></label>
        <input id="mobileNumber" name="mobileNumber" type="tel" inputmode="numeric" placeholder="09XXXXXXXXX" required>
      </div>
      <div class="field">
        <label for="profession">Profession <span class="required">*</span></label>
        <select id="profession" name="profession" required>
          <option value="">Select profession</option>
          ${renderProfessionOptions()}
        </select>
      </div>
      <div class="field">
        <label for="invitedBy">Name of the person who invited you <span class="required">*</span></label>
        <input id="invitedBy" name="invitedBy" type="text" required>
      </div>
      <div class="field full">
        <label for="attendanceConfirmation">Will you be attending? <span class="required">*</span></label>
        <select id="attendanceConfirmation" name="attendanceConfirmation" required>
          <option value="">Select response</option>
          <option value="Yes, I will be attending">Yes, I will be attending</option>
          <option value="No, I cannot attend">No, I cannot attend</option>
        </select>
      </div>
    </div>
  `;
}

function renderAttendanceFields() {
  return `
    <div class="grid">
      <div class="field full">
        <label for="fullName">Full Name <span class="required">*</span></label>
        <input id="fullName" name="fullName" type="text" autocomplete="name" required>
      </div>
      <div class="field">
        <label for="birthday">Birthday <span class="required">*</span></label>
        <div class="date-input-shell">
          <input id="birthday" name="birthday" type="date" data-mobile-picker required>
          <button type="button" class="date-input-shell-button" data-show-picker data-target="birthday" aria-label="Open birthday picker">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 3V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M17 3V6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M4 9H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" stroke-width="1.8"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="field">
        <label for="mobileNumber">Mobile Number <span class="required">*</span></label>
        <input id="mobileNumber" name="mobileNumber" type="tel" inputmode="numeric" placeholder="09XXXXXXXXX" required>
      </div>
      <div class="field">
        <label for="emailAddress">Email Address <span class="required">*</span></label>
        <input id="emailAddress" name="emailAddress" type="email" autocomplete="email" required>
      </div>
      <div class="field full">
        <label for="address">Address <span class="required">*</span></label>
        <textarea id="address" name="address" placeholder="Complete home address" required></textarea>
      </div>
      <div class="field">
        <label for="profession">Profession <span class="required">*</span></label>
        <select id="profession" name="profession" required>
          <option value="">Select profession</option>
          ${renderProfessionOptions()}
        </select>
      </div>
    </div>
  `;
}

function renderAdminFrame({
  activeView,
  user,
  eventCount = null,
  title,
  titleClass = '',
  subtitle,
  badge,
  headerDetails = '',
  headerControls = '',
  content
}) {
  const hasEventHeader = headerDetails.includes('event-header-schedule-form');
  return `
    <div class="admin-page">
      <div class="admin-app-shell">
        ${renderAdminSidebar(activeView, user, eventCount)}
        <div class="admin-main">
          <header class="admin-header-modern${hasEventHeader ? ' admin-header-modern-event' : ''}">
            <div class="admin-header-main${headerDetails ? ' has-details' : ''}">
              <div class="admin-header-copy">
                <span class="section-kicker">${escapeHtml(badge || 'Event admin')}</span>
                <h1 class="${escapeAttribute(titleClass)}"${titleClass ? ' data-dynamic-title' : ''}>${escapeHtml(title)}</h1>
                <p>${escapeHtml(subtitle || '')}</p>
                ${headerDetails}
              </div>
            </div>
            <div class="admin-header-actions">
              ${headerControls}
            </div>
          </header>
          <main class="admin-content">${content}</main>
        </div>
      </div>
    </div>
  `;
}

function renderEventCard(eventData) {
  return `
    <article class="event-card event-card-modern">
      <div class="event-card-meta">
        <div class="eyebrow">${escapeHtml(eventData.eventType)}</div>
        <span class="event-card-id">${escapeHtml(shortEventId(eventData.eventId))}</span>
      </div>
      <h3>${escapeHtml(eventData.eventLabel)}</h3>
      <div class="event-card-facts">
        <span>${escapeHtml(eventData.displayDateTime)}</span>
        <span>${escapeHtml(eventData.location)}</span>
      </div>
      <div class="event-card-actions">
        <a href="/events/${encodeURIComponent(eventData.eventId)}" data-link class="button-link">Manage Event</a>
        <a href="${escapeAttribute(eventData.rsvpPath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary">Open RSVP</a>
        <a href="${escapeAttribute(eventData.attendancePath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary">Open Attendance</a>
      </div>
    </article>
  `;
}

function renderTable(columns, rows) {
  return `
    <div class="table-wrap">
      <table class="response-table">
        <thead>
          <tr>
            ${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  ${columns.map((column) => `<td>${escapeHtml(row[column] || '')}</td>`).join('')}
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdminSidebar(activeView, user, eventCount) {
  const initials = getInitials(user ? user.fullName : 'Organizer');
  const resolvedEventCount = Number.isFinite(eventCount) ? eventCount : state.cachedEventCount;
  const countLabel = Number.isFinite(resolvedEventCount)
    ? `${resolvedEventCount} event${resolvedEventCount === 1 ? '' : 's'}`
    : 'Admin console';

  return `
    <aside class="admin-sidebar">
      <div class="sidebar-top">
        <img class="sidebar-logo" src="/assets/logo/Genesys_Logo2.svg" alt="GeneSys logo">
        <div class="sidebar-workspace">
          <span class="sidebar-workspace-label">Event workspace</span>
          <span class="sidebar-workspace-meta">${escapeHtml(countLabel)}</span>
        </div>
      </div>
      <nav class="sidebar-nav" aria-label="Primary">
        <a href="/dashboard" data-link class="sidebar-link${activeView === 'dashboard' ? ' is-active' : ''}">
          <span class="sidebar-link-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 10.4L12 4L20 10.4V19C20 19.6 19.6 20 19 20H5C4.4 20 4 19.6 4 19V10.4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              <path d="M9 20V12.8H15V20" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="sidebar-link-label">Dashboard</span>
        </a>
        <a href="/events/new" data-link class="sidebar-link${activeView === 'create' ? ' is-active' : ''}">
          <span class="sidebar-link-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M5 12H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="sidebar-link-label">New Event</span>
        </a>
        <a href="/events/archive" data-link class="sidebar-link${activeView === 'archive' ? ' is-active' : ''}">
          <span class="sidebar-link-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7.5C4 6.7 4.7 6 5.5 6H18.5C19.3 6 20 6.7 20 7.5V9.5C20 10.3 19.3 11 18.5 11H5.5C4.7 11 4 10.3 4 9.5V7.5Z" stroke="currentColor" stroke-width="1.8"/>
              <path d="M6.5 11V17.5C6.5 18.3 7.2 19 8 19H16C16.8 19 17.5 18.3 17.5 17.5V11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path d="M9 14H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="sidebar-link-label">Archive</span>
        </a>
      </nav>
      <div class="sidebar-footer">
        <div class="profile-anchor">
          <button type="button" class="profile-trigger" data-profile-toggle aria-label="Open profile actions" aria-expanded="false">
            <span class="profile-trigger-shell">
              <span class="sidebar-avatar">${escapeHtml(initials)}</span>
              <span class="profile-trigger-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </span>
          </button>
          <div id="profilePopover" class="profile-popover" data-profile-popover data-view="menu" hidden>
            <div class="profile-popover-menu">
              <button type="button" class="profile-popover-action" data-profile-change title="Change password" aria-label="Change password">
                <span class="profile-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 14C8.1 14 9 13.1 9 12C9 10.9 8.1 10 7 10C5.9 10 5 10.9 5 12C5 13.1 5.9 14 7 14Z" stroke="currentColor" stroke-width="1.8"/>
                    <path d="M9 12H19L21 10V6H15L13 8H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span class="profile-action-label">Change password</span>
              </button>
              <button type="button" class="profile-popover-action" data-logout title="Log out" aria-label="Log out">
                <span class="profile-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 21H5.8C4.8 21 4 20.2 4 19.2V4.8C4 3.8 4.8 3 5.8 3H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 17L20 12L16 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M20 12H10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span class="profile-action-label">Log out</span>
              </button>
              <button type="button" class="profile-popover-action profile-popover-back-action" data-profile-back title="Back" aria-label="Back to profile menu">
                <span class="profile-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M8 10L12 14L16 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span class="profile-action-label">Back</span>
              </button>
            </div>
            <div class="profile-password-panel">
              <div class="profile-password-head">
                <strong>Change password</strong>
                <button type="button" class="profile-back-button" data-profile-back aria-label="Back to profile menu">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M14 8L10 12L14 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
              <form id="changePasswordForm" class="profile-password-form">
                <div class="field">
                  <label for="currentPassword">Current password</label>
                  <div class="password-input-wrap profile-password-input-wrap">
                    <button
                      type="button"
                      class="password-toggle profile-password-toggle"
                      data-password-toggle
                      data-target="currentPassword"
                      aria-label="Show password"
                      aria-pressed="false"
                    >
                      <svg class="icon-eye" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M2 12C3.9 7.9 7.4 5.5 12 5.5C16.6 5.5 20.1 7.9 22 12C20.1 16.1 16.6 18.5 12 18.5C7.4 18.5 3.9 16.1 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="3.1" stroke="currentColor" stroke-width="1.8"/>
                      </svg>
                      <svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        <path d="M10.6 6C11.1 5.8 11.5 5.7 12 5.7C16.4 5.7 19.8 8 21.7 12C20.9 13.8 19.7 15.3 18.3 16.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14.1 14.3C13.6 14.8 12.8 15.1 12 15.1C10.3 15.1 8.9 13.7 8.9 12C8.9 11.2 9.2 10.4 9.7 9.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    <input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required>
                  </div>
                </div>
                <div class="field">
                  <label for="newPassword">New password</label>
                  <div class="password-input-wrap profile-password-input-wrap">
                    <button
                      type="button"
                      class="password-toggle profile-password-toggle"
                      data-password-toggle
                      data-target="newPassword"
                      aria-label="Show password"
                      aria-pressed="false"
                    >
                      <svg class="icon-eye" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M2 12C3.9 7.9 7.4 5.5 12 5.5C16.6 5.5 20.1 7.9 22 12C20.1 16.1 16.6 18.5 12 18.5C7.4 18.5 3.9 16.1 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="3.1" stroke="currentColor" stroke-width="1.8"/>
                      </svg>
                      <svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        <path d="M10.6 6C11.1 5.8 11.5 5.7 12 5.7C16.4 5.7 19.8 8 21.7 12C20.9 13.8 19.7 15.3 18.3 16.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14.1 14.3C13.6 14.8 12.8 15.1 12 15.1C10.3 15.1 8.9 13.7 8.9 12C8.9 11.2 9.2 10.4 9.7 9.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    <input id="newPassword" name="newPassword" type="password" autocomplete="new-password" required>
                  </div>
                </div>
                <div class="field">
                  <label for="confirmPassword">Confirm password</label>
                  <div class="password-input-wrap profile-password-input-wrap">
                    <button
                      type="button"
                      class="password-toggle profile-password-toggle"
                      data-password-toggle
                      data-target="confirmPassword"
                      aria-label="Show password"
                      aria-pressed="false"
                    >
                      <svg class="icon-eye" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M2 12C3.9 7.9 7.4 5.5 12 5.5C16.6 5.5 20.1 7.9 22 12C20.1 16.1 16.6 18.5 12 18.5C7.4 18.5 3.9 16.1 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="3.1" stroke="currentColor" stroke-width="1.8"/>
                      </svg>
                      <svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        <path d="M10.6 6C11.1 5.8 11.5 5.7 12 5.7C16.4 5.7 19.8 8 21.7 12C20.9 13.8 19.7 15.3 18.3 16.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14.1 14.3C13.6 14.8 12.8 15.1 12 15.1C10.3 15.1 8.9 13.7 8.9 12C8.9 11.2 9.2 10.4 9.7 9.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    <input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" required>
                  </div>
                </div>
                <div id="changePasswordStatus" class="status" aria-live="polite"></div>
                <button type="submit" class="profile-submit-button">Update password</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </aside>
  `;
}

function renderSummaryCard(title, value, caption, tone = '') {
  return `
    <article class="summary-card ${tone}">
      <span>${escapeHtml(title)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(caption)}</p>
    </article>
  `;
}

function summarizeEvents(events) {
  const nextUpcoming = getPrimaryEvent(events);
  const uniqueEventTypes = new Set(events.map((eventData) => eventData.eventType).filter(Boolean)).size;
  const formsPublished = events.reduce((count, eventData) => count + (eventData.rsvpPath ? 1 : 0) + (eventData.attendancePath ? 1 : 0), 0);

  if (!events.length) {
    return {
      totalEvents: 0,
      uniqueEventTypes: 0,
      formsPublished: 0,
      upcomingDate: 'No schedule yet',
      upcomingLabel: 'Create an event to publish your first workflow.',
      highlightTitle: 'Build your first event workflow',
      highlightText: 'This space becomes your operations dashboard once the first event is created.',
      highlightValue: '0 live events',
      highlightCaption: 'No links or response pages published yet'
    };
  }

  return {
    totalEvents: events.length,
    uniqueEventTypes,
    formsPublished,
    upcomingDate: nextUpcoming ? formatMetricDate(nextUpcoming.dateTime) : 'TBD',
    upcomingLabel: nextUpcoming ? nextUpcoming.eventLabel : 'No upcoming event',
    highlightTitle: nextUpcoming ? 'Next launch window' : 'Events are active',
    highlightText: nextUpcoming
      ? `The next event scheduled in your workspace is ${nextUpcoming.eventType} at ${nextUpcoming.location}.`
      : 'All current events are published and ready for RSVP and attendance collection.',
    highlightValue: nextUpcoming ? formatMetricDateTime(nextUpcoming.dateTime) : `${events.length} configured`,
    highlightCaption: nextUpcoming ? 'Use the event card below to open forms and responses' : 'Published workflows available'
  };
}

function getPrimaryEvent(events) {
  const sortedByDate = [...events]
    .filter((eventData) => !Number.isNaN(new Date(eventData.dateTime).getTime()))
    .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime());
  const now = Date.now();

  return sortedByDate.find((eventData) => new Date(eventData.dateTime).getTime() >= now) || sortedByDate[0] || events[0] || null;
}

function getActiveWorkspaceEvents(events) {
  return events.filter((eventData) => !eventData.isArchived && !eventData.isDeleted);
}

function getArchiveEvents(events) {
  return events
    .filter((eventData) => eventData.isArchived && !eventData.isDeleted)
    .sort((left, right) => new Date(right.dateTime).getTime() - new Date(left.dateTime).getTime());
}

function renderSelectedEventQuickPanel(eventData) {
  if (!eventData) {
    return `
      <div class="selected-event-empty">
        <span class="section-kicker">Selected event</span>
        <strong>No event selected</strong>
        <p>Create an event to unlock RSVP links, attendance pages, and response views.</p>
      </div>
    `;
  }

  return `
    <div class="selected-event-quick-panel">
      <span class="section-kicker">Selected event</span>
      <div class="selected-event-summary">
        <strong>${escapeHtml(eventData.eventType)}</strong>
      </div>
      <div class="selected-event-facts">
        <span>${escapeHtml(eventData.displayDateTime)}</span>
        <span>${escapeHtml(eventData.location)}</span>
      </div>
      <div class="selected-event-actions">
        <a href="${escapeAttribute(eventData.rsvpPath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary selected-event-action-rsvp-open">
          <span class="selected-event-action-icon">${renderEventActionIcon('external')}</span>
          <span>Open RSVP</span>
        </a>
        <a href="${escapeAttribute(eventData.attendancePath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary selected-event-action-attendance-open">
          <span class="selected-event-action-icon">${renderEventActionIcon('external')}</span>
          <span>Open Attendance</span>
        </a>
        <a href="/events/${encodeURIComponent(eventData.eventId)}/rsvp-responses" data-link class="button-link button-link-secondary selected-event-action-rsvp-responses">
          <span class="selected-event-action-icon">${renderEventActionIcon('responses')}</span>
          <span>RSVP Responses</span>
        </a>
        <a href="/events/${encodeURIComponent(eventData.eventId)}/attendance-responses" data-link class="button-link button-link-secondary selected-event-action-attendance-responses">
          <span class="selected-event-action-icon">${renderEventActionIcon('responses')}</span>
          <span>Attendance Responses</span>
        </a>
      </div>
    </div>
  `;
}

function renderArchiveEventCard(eventData) {
  return `
    <article class="archive-card">
      <div class="archive-card-head">
        <div>
          <span class="section-kicker">Archived event</span>
          <h3>${escapeHtml(eventData.eventLabel)}</h3>
        </div>
        <span class="event-lifecycle-pill is-archived">${escapeHtml(getEventLifecycleLabel(eventData))}</span>
      </div>
      <div class="archive-card-facts">
        <span>${escapeHtml(eventData.displayDateTime)}</span>
        <span>${escapeHtml(eventData.location)}</span>
      </div>
      <div class="archive-card-actions">
        <a href="/events/${encodeURIComponent(eventData.eventId)}" data-link class="button-link">View Event</a>
      </div>
    </article>
  `;
}

function shortEventId(value) {
  return String(value || '').slice(-6).toUpperCase();
}

function getInitials(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'EA';
}

function formatMetricDate(dateTime) {
  const parsedDate = new Date(dateTime);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'TBD';
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatMetricDateTime(dateTime) {
  const parsedDate = new Date(dateTime);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(dateTime || 'TBD');
  }

  return parsedDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatDateTimeLocalValue(dateTime) {
  const parsedDate = new Date(dateTime);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(dateTime || '');
  }

  const offsetMinutes = parsedDate.getTimezoneOffset();
  const localDate = new Date(parsedDate.getTime() - offsetMinutes * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function getEventLifecycleLabel(eventData) {
  if (eventData.isPast) {
    return 'Past Event';
  }

  if (eventData.isManuallyArchived) {
    return 'Archived';
  }

  return 'Active Event';
}

function renderErrorPage(title, message) {
  return `
    <div class="auth-page">
      <section class="auth-card">
        <div class="eyebrow">Something went wrong</div>
        <h1>${escapeHtml(title)}</h1>
        <p class="lede">${escapeHtml(message)}</p>
        <div class="actions stacked">
          <a href="/" data-link class="button-link">Back to Home</a>
        </div>
      </section>
    </div>
  `;
}

function renderLoading(message, options = {}) {
  if (options.admin) {
    const adminOptions = options.admin;

    renderPage(
      renderAdminFrame({
        activeView: adminOptions.activeView || 'dashboard',
        user: state.session,
        eventCount: state.cachedEventCount,
        title: adminOptions.title || 'Loading workspace',
        subtitle: adminOptions.subtitle || 'Preparing your admin tools.',
        badge: adminOptions.badge || 'Please wait',
        content: `
          <section class="workspace-panel admin-loading-panel">
            <div class="admin-inline-loader" role="status" aria-live="polite">
              <div class="loading-logo-wrap loading-logo-wrap-compact" aria-hidden="true">
                <img class="loading-logo" src="/assets/logo/Genesys_Logo2.svg" alt="">
              </div>
              <div class="admin-inline-loader-copy">
                <strong>Loading</strong>
                <p>${escapeHtml(message)}</p>
              </div>
            </div>
          </section>
        `
      })
    );
    return;
  }

  renderPage(`
    <div class="auth-page">
      <section class="auth-card loading-card">
        <div class="loading-logo-wrap" aria-hidden="true">
          <img class="loading-logo" src="/assets/logo/Genesys_Logo2.svg" alt="">
        </div>
        <div class="loading-copy">
          <strong>Loading</strong>
          <p>${escapeHtml(message)}</p>
        </div>
      </section>
    </div>
  `);
}

function toggleProfilePopover() {
  const popover = document.getElementById('profilePopover');
  const trigger = document.querySelector('[data-profile-toggle]');

  if (!popover || !trigger) {
    return;
  }

  const currentState = popover.dataset.state || 'closed';

  if (currentState === 'open' || currentState === 'opening') {
    closeProfilePopover();
    return;
  }

  if (popover._hideTimer) {
    window.clearTimeout(popover._hideTimer);
    popover._hideTimer = null;
  }

  popover.hidden = false;
  popover.dataset.state = 'opening';
  popover.classList.remove('is-closing');
  showProfileMenu();
  trigger.setAttribute('aria-expanded', 'true');
  trigger.setAttribute('aria-label', 'Close profile actions');
  trigger.classList.add('is-open');

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (!popover.isConnected || popover.hidden) {
        return;
      }

      popover.dataset.state = 'open';
      popover.classList.add('is-open');
    });
  });
}

function closeProfilePopover() {
  const popover = document.getElementById('profilePopover');
  const trigger = document.querySelector('[data-profile-toggle]');

  if (!popover || popover.hidden) {
    return;
  }

  if (popover._hideTimer) {
    window.clearTimeout(popover._hideTimer);
  }

  popover.dataset.state = 'closing';
  popover.classList.remove('is-open');
  popover.classList.add('is-closing');
  showProfileMenu();

  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Open profile actions');
    trigger.classList.remove('is-open');
  }

  popover._hideTimer = window.setTimeout(() => {
    if (!popover.isConnected) {
      return;
    }

    popover.hidden = true;
    popover.dataset.state = 'closed';
    popover.classList.remove('is-closing');
    popover._hideTimer = null;
  }, 320);
}

function closeProfilePopoverIfOutside(target) {
  const popover = document.getElementById('profilePopover');

  if (!popover || popover.hidden) {
    return;
  }

  const insidePopover = target.closest('[data-profile-popover]');
  const insideTrigger = target.closest('[data-profile-toggle]');

  if (!insidePopover && !insideTrigger) {
    closeProfilePopover();
  }
}

function showPasswordForm() {
  const popover = document.getElementById('profilePopover');
  const form = document.getElementById('changePasswordForm');
  const status = document.getElementById('changePasswordStatus');
  const changeButton = popover ? popover.querySelector('[data-profile-change]') : null;
  const logoutButton = popover ? popover.querySelector('[data-logout]') : null;

  if (!popover) {
    return;
  }

  popover.dataset.view = 'password';

  if (changeButton) {
    changeButton.classList.add('is-active');
  }

  if (logoutButton) {
    logoutButton.classList.remove('is-active');
  }

  if (form) {
    form.reset();
    const currentPasswordInput = form.querySelector('#currentPassword');

    if (status) {
      setStatus(status, '', '');
    }

    if (currentPasswordInput) {
      window.setTimeout(() => currentPasswordInput.focus(), 140);
    }
  }
}

function showProfileMenu() {
  const popover = document.getElementById('profilePopover');
  const menu = popover ? popover.querySelector('.profile-popover-menu') : null;
  const changeButton = popover ? popover.querySelector('[data-profile-change]') : null;
  const logoutButton = popover ? popover.querySelector('[data-logout]') : null;

  if (!popover || !menu) {
    return;
  }

  popover.dataset.view = 'menu';
  menu.hidden = false;

  if (changeButton) {
    changeButton.classList.remove('is-active');
  }

  if (logoutButton) {
    logoutButton.classList.remove('is-active');
  }
}

function renderPage(html) {
  if (state.authSlideshowTimer) {
    clearInterval(state.authSlideshowTimer);
    state.authSlideshowTimer = null;
  }

  app.innerHTML = html;
}

function navigate(path, replace = false) {
  const normalized = normalizePath(path);

  if (replace) {
    window.history.replaceState({}, '', normalized);
  } else {
    window.history.pushState({}, '', normalized);
  }

  void renderRoute();
}

function normalizePath(pathname) {
  const cleanPath = pathname.split('?')[0];

  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    return cleanPath.slice(0, -1);
  }

  return cleanPath || '/';
}

async function fetchJson(path, options = {}) {
  const response = await apiFetch(path, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Something went wrong.');
  }

  return result;
}

async function apiFetch(path, options = {}) {
  let lastError;

  for (const base of apiBaseCandidates) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        credentials: 'include'
      });

      if (response.status === 404) {
        lastError = new Error(`API route not found at ${base}${path}`);
        continue;
      }

      state.activeApiBase = base;
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to reach the API.');
}

function renderProfessionOptions() {
  return state.config.professions
    .map((profession) => `<option value="${escapeAttribute(profession)}">${escapeHtml(profession)}</option>`)
    .join('');
}

function setStatus(element, message, className) {
  element.textContent = message;
  element.className = `status${className ? ` ${className}` : ''}`;
}

function setButtonLoading(button, isLoading, text) {
  button.disabled = isLoading;

  if (isLoading) {
    if (!button.dataset.loadingRestoreHtml) {
      button.dataset.loadingRestoreHtml = button.innerHTML;
    }

    button.textContent = text;
    return;
  }

  if (button.dataset.loadingRestoreHtml) {
    button.innerHTML = button.dataset.loadingRestoreHtml;
    delete button.dataset.loadingRestoreHtml;
    return;
  }

  button.textContent = text;
}

function buildQrUrl(url) {
  const params = new URLSearchParams({
    text: url,
    size: '320',
    margin: '1',
    dark: '121826',
    light: 'ffffff',
    ecLevel: 'H'
  });

  return `https://quickchart.io/qr?${params.toString()}`;
}

function buildBrandedQrDocument(eventLabel, qrUrl, targetUrl) {
  const pageTitle = `${eventLabel} RSVP QR`;
  const logoUrl = `${window.location.origin}/assets/logo/Genesys_Logo2.svg`;

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(pageTitle)}</title>
      <style>
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 28px;
          font-family: "Plus Jakarta Sans", sans-serif;
          background:
            radial-gradient(circle at top left, rgba(92, 102, 255, 0.16), transparent 28%),
            radial-gradient(circle at bottom right, rgba(225, 248, 111, 0.16), transparent 24%),
            linear-gradient(180deg, #f4f7fd 0%, #edf2fb 100%);
          color: #121826;
        }

        .qr-sheet {
          width: min(460px, 100%);
          display: grid;
          gap: 18px;
          padding: 28px;
          border-radius: 32px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(206, 214, 234, 0.92);
          box-shadow: 0 24px 60px rgba(50, 73, 125, 0.16);
          text-align: center;
        }

        .qr-sheet span {
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #5160e8;
        }

        .qr-sheet h1 {
          margin: 0;
          font-size: clamp(1.5rem, 4vw, 2rem);
          line-height: 1.08;
        }

        .qr-stage {
          position: relative;
          width: min(320px, 100%);
          aspect-ratio: 1;
          margin: 0 auto;
          padding: 20px;
          border-radius: 34px;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          box-shadow: inset 0 0 0 1px rgba(214, 220, 234, 0.92);
        }

        .qr-stage img:first-child {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 26px;
          background: #ffffff;
        }

        .qr-stage img:last-child {
          position: absolute;
          inset: 50%;
          width: 24%;
          aspect-ratio: 1;
          transform: translate(-50%, -50%);
          padding: 10px;
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 14px 28px rgba(43, 58, 105, 0.16);
        }

        .qr-url {
          margin: 0;
          font-size: 0.84rem;
          line-height: 1.55;
          color: #6f7992;
          word-break: break-word;
        }
      </style>
    </head>
    <body>
      <main class="qr-sheet">
        <span>QR Access</span>
        <h1>${escapeHtml(pageTitle)}</h1>
        <div class="qr-stage">
          <img src="${escapeAttribute(qrUrl)}" alt="${escapeAttribute(pageTitle)}">
          <img src="${escapeAttribute(logoUrl)}" alt="">
        </div>
        <p class="qr-url">${escapeHtml(targetUrl)}</p>
      </main>
    </body>
  </html>`;
}

function openBrandedQrTab(eventData, rsvpUrl) {
  const qrWindow = window.open('about:blank', '_blank');

  if (!qrWindow) {
    window.open(buildQrUrl(rsvpUrl), '_blank');
    return;
  }

  qrWindow.document.open();
  qrWindow.document.write(buildBrandedQrDocument(eventData.eventLabel, buildQrUrl(rsvpUrl), rsvpUrl));
  qrWindow.document.close();
}

function syncDynamicHeaderTitle() {
  const title = document.querySelector('[data-dynamic-title]');

  if (!title) {
    return;
  }

  const fitTitle = () => {
    const publicTitle = title.closest('.public-hero-copy');
    const container = title.closest('.admin-header-main') || title.closest('.admin-header-copy') || publicTitle;
    const mobileEventHeader = title.closest('.admin-header-modern-event');

    if (!container) {
      return;
    }

    if (mobileEventHeader && window.innerWidth <= 720) {
      title.style.fontSize = '';
      title.style.maxWidth = '';
      title.style.whiteSpace = '';
      return;
    }

    const isPublicTitle = Boolean(publicTitle);

    const maxSize = isPublicTitle
      ? (window.innerWidth <= 720 ? 1.9 : (window.innerWidth <= 920 ? 3.1 : 2.8))
      : (window.innerWidth <= 920 ? 2.2 : 3.2);
    const minSize = isPublicTitle
      ? (window.innerWidth <= 360 ? 0.6 : (window.innerWidth <= 720 ? 0.68 : 1.08))
      : (window.innerWidth <= 920 ? 1 : 1.18);
    const availableWidth = Math.max(container.clientWidth - (isPublicTitle ? 0 : 18), 0);
    let nextSize = maxSize;

    title.style.fontSize = `${maxSize}rem`;
    title.style.maxWidth = `${availableWidth}px`;
    title.style.whiteSpace = 'nowrap';

    while (title.scrollWidth > availableWidth && nextSize > minSize) {
      nextSize = Math.max(minSize, nextSize - 0.05);
      title.style.fontSize = `${nextSize.toFixed(2)}rem`;
    }
  };

  state.headerTitleResizeHandler = () => {
    window.requestAnimationFrame(fitTitle);
  };

  window.addEventListener('resize', state.headerTitleResizeHandler);
  window.requestAnimationFrame(fitTitle);
  window.setTimeout(fitTitle, 140);
  document.fonts?.ready?.then(() => {
    window.requestAnimationFrame(fitTitle);
  });
}

function rsvpColumnFallback() {
  return [
    'Full Name',
    'Email Address',
    'Mobile Number',
    'Profession',
    'Invited By',
    'Attendance Confirmation'
  ];
}

function attendanceColumnFallback() {
  return [
    'Full Name',
    'Birthday',
    'Mobile Number',
    'Email Address',
    'Address',
    'Profession'
  ];
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
