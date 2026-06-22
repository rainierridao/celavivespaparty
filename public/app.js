const app = document.getElementById('app');
const INBODY_EVENT_TYPE = 'Wellness Assessment';
const LEGACY_INBODY_EVENT_TYPE = 'Free InBody Assessment';
const INBODY_EVENT_DISPLAY_LABEL = 'Free Wellness Assessment';
const INBODY_EVENT_TYPES = [INBODY_EVENT_TYPE, LEGACY_INBODY_EVENT_TYPE];
const CELAVIVE_RAFFLE_EVENT_TYPE = 'Celavive Spa Party - Raffle Entry';
const BEAUTY_CARAVAN_EVENT_TYPE = 'Beauty Caravan';
const WELLNESS_QUIZ_EVENT_TYPE = 'Wellness Quiz';
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
const publicInBodySlides = [
  '/assets/inbody/b-y-g-SaN6XB1DrJk-unsplash.jpg',
  '/assets/inbody/gabin-vallet-J154nEkpzlQ-unsplash.jpg',
  '/assets/inbody/jared-rice-xce530fBHrk-unsplash.jpg',
  '/assets/inbody/mariana-medvedeva-usfIE5Yc7PY-unsplash.jpg'
];
const celaviveRaffleQuestions = [
  {
    name: 'topSkinConcerns',
    label: 'What are your top skin concerns?',
    type: 'checkbox',
    options: [
      'Dryness',
      'Dull or tired-looking skin',
      'Fine lines/wrinkles',
      'Acne or breakouts',
      'Dark spots/pigmentation',
      'Sensitive skin/redness',
      'Uneven skin tone',
      'Enlarged pores'
    ]
  },
  { name: 'skinType', label: 'How would you describe your skin type?', options: ['Dry', 'Oily', 'Combination', 'Sensitive', 'I’m not sure'] },
  { name: 'skincareImportance', label: 'How important is skincare to you?', options: ['Not a priority', 'Somewhat important', 'Important', 'Very important — I invest in skincare regularly'] },
  { name: 'buyingFrequency', label: 'How often do you buy skincare products?', options: ['Rarely', 'Every 3–6 months', 'Every few months', 'Monthly or regularly'] },
  { name: 'currentRoutine', label: 'Which best describes your current skincare routine?', options: ['Soap only', 'Basic routine (cleanser/moisturizer)', '3–4 step skincare routine', 'Multi-step skincare routine', 'I already invest in premium skincare'] },
  { name: 'monthlySpend', label: 'On average, how much do you spend on skincare/self-care monthly?', options: ['Below ₱500', '₱500–₱1,500', '₱1,500–₱3,000', '₱3,000+'] },
  { name: 'desiredResult', label: 'What skincare result would you love to improve most?', options: ['Brighter/glowing skin', 'Hydration/moisture', 'Fewer fine lines', 'Clearer skin', 'Even skin tone', 'Firmer-looking skin'] },
  { name: 'premiumExperience', label: 'Have you tried professional skincare or premium skincare products before?', options: ['No, not yet', 'A few times', 'Yes, occasionally', 'Yes, regularly'] },
  { name: 'willingnessToInvest', label: 'If you found a skincare regimen that truly works for your skin, would you consider investing in it?', options: ['Not right now', 'Maybe', 'Yes, if it fits my needs', 'Definitely'] },
  { name: 'personalizedExperienceInterest', label: 'Would you be interested in a personalized full skincare experience if selected?', options: ['Yes, definitely', 'Maybe', 'Not right now'] }
];
const wellnessQuizQuestions = [
  {
    name: 'currentConcerns',
    label: 'Which of the following concerns do you currently experience? (Check all that apply)',
    type: 'checkbox',
    options: ['Low Energy / Easily Tired', 'Poor Sleep', 'Stress or Mental Fatigue', 'Joint Pain', 'Back Pain', 'Muscle Recovery Issues', 'Weight Gain', 'High Blood Pressure', 'High Cholesterol', 'High Blood Sugar', 'Frequent Colds or Low Immunity', 'Digestive Concerns', 'Skin Concerns', 'None of the Above']
  },
  { name: 'healthRating', label: 'On a scale of 1-10, how would you rate your current health?', options: ['1-3 Needs Improvement', '4-6 Fair', '7-8 Good', '9-10 Excellent'] },
  { name: 'healthGoal', label: 'What health goal would you most like to improve in the next 90 days?', options: ['More Energy', 'Better Sleep', 'Weight Management', 'Better Fitness Performance', 'Faster Recovery', 'Stronger Immunity', 'Healthier Skin', 'Better Overall Wellness'] },
  { name: 'consultationInterest', label: 'Would you be open to receiving a complimentary wellness consultation?', options: ['Yes', 'Maybe', 'Not at the moment'] }
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
      eventTypes: ['OPP', 'Celavive Spa Party', BEAUTY_CARAVAN_EVENT_TYPE, CELAVIVE_RAFFLE_EVENT_TYPE, INBODY_EVENT_TYPE, WELLNESS_QUIZ_EVENT_TYPE],
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
      const inBodyResult = isInBodyEvent(eventResult.event)
        ? await fetchJson(`/events/${eventId}/inbody-responses`)
        : { responses: [] };
      const celaviveRaffleResult = isCelaviveRaffleEvent(eventResult.event)
        ? await fetchJson(`/events/${eventId}/celavive-raffle-responses`)
        : { responses: [] };
      const wellnessQuizResult = isWellnessQuizEvent(eventResult.event)
        ? await fetchJson(`/events/${eventId}/wellness-quiz-responses`)
        : { responses: [] };
      renderPage(renderEventDetailPage(eventResult.event, {
        rsvpResponses: rsvpResult.responses || [],
        attendanceResponses: attendanceResult.responses || [],
        inBodyResponses: inBodyResult.responses || [],
        celaviveRaffleResponses: celaviveRaffleResult.responses || [],
        wellnessQuizResponses: wellnessQuizResult.responses || []
      }));
      attachAdminShellHandlers();
      attachEventDetailHandlers(eventResult.event);
    } catch (error) {
      renderPage(renderErrorPage('Unable to load that event.', error.message));
    }

    return;
  }

  const inBodyResponseMatch = pathname.match(/^\/events\/([^/]+)\/inbody-responses$/);

  if (inBodyResponseMatch) {
    if (!(await guardAuthenticated())) {
      return;
    }

    renderLoading('Loading InBody responses...', {
      admin: {
        activeView: 'dashboard',
        title: 'Loading InBody responses',
        subtitle: 'Preparing assessment entries and bookings for review.',
        badge: 'Responses'
      }
    });
    attachAdminShellHandlers();

    try {
      const result = await fetchJson(`/events/${inBodyResponseMatch[1]}/inbody-responses`);
      renderPage(renderResponsesPage('InBody Responses', result.event, result.responses, 'inbody'));
      attachAdminShellHandlers();
      attachResponseDeleteHandlers(result.event, 'inbody');
      attachInBodyResponseHandlers(result.event);
    } catch (error) {
      renderPage(renderErrorPage('Unable to load InBody responses.', error.message));
    }

    return;
  }

  const celaviveRaffleResponseMatch = pathname.match(/^\/events\/([^/]+)\/celavive-raffle-responses$/);

  if (celaviveRaffleResponseMatch) {
    if (!(await guardAuthenticated())) {
      return;
    }

    renderLoading('Loading Celavive raffle responses...', {
      admin: {
        activeView: 'dashboard',
        title: 'Loading Celavive raffle responses',
        subtitle: 'Preparing skin profile entries and prospect scoring for review.',
        badge: 'Responses'
      }
    });
    attachAdminShellHandlers();

    try {
      const result = await fetchJson(`/events/${celaviveRaffleResponseMatch[1]}/celavive-raffle-responses`);
      renderPage(renderResponsesPage('Celavive Raffle Responses', result.event, result.responses, 'celavive-raffle'));
      attachAdminShellHandlers();
      attachResponseDeleteHandlers(result.event, 'celavive-raffle');
    } catch (error) {
      renderPage(renderErrorPage('Unable to load Celavive raffle responses.', error.message));
    }

    return;
  }

  const wellnessQuizResponseMatch = pathname.match(/^\/events\/([^/]+)\/wellness-quiz-responses$/);

  if (wellnessQuizResponseMatch) {
    if (!(await guardAuthenticated())) {
      return;
    }

    renderLoading('Loading Wellness Quiz responses...');

    try {
      const result = await fetchJson(`/events/${wellnessQuizResponseMatch[1]}/wellness-quiz-responses`);
      renderPage(renderResponsesPage('Wellness Quiz Responses', result.event, result.responses, 'wellness-quiz'));
      attachAdminShellHandlers();
      attachResponseDeleteHandlers(result.event, 'wellness-quiz');
    } catch (error) {
      renderPage(renderErrorPage('Unable to load Wellness Quiz responses.', error.message));
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
      attachResponseDeleteHandlers(result.event, 'rsvp');
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
      attachResponseDeleteHandlers(result.event, 'attendance');
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

  const inBodyMatch = pathname.match(/^\/inbody\/([^/]+)$/);

  if (inBodyMatch) {
    renderLoading('Loading wellness assessment form...');

    try {
      const result = await fetchJson(`/public-events/${inBodyMatch[1]}`);

      if (!isInBodyEvent(result.event)) {
        renderPage(renderErrorPage('InBody page unavailable.', 'This event does not have a Wellness Assessment workflow.'));
        return;
      }

      renderPage(renderPublicInBodyPage(result.event));
      attachPublicShowcase();
      syncDynamicHeaderTitle();
      attachInBodyHandlers(result.event);
    } catch (error) {
      renderPage(renderErrorPage('Unable to load that InBody page.', error.message));
    }

    return;
  }

  const celaviveRaffleMatch = pathname.match(/^\/celavive-raffle\/([^/]+)$/);

  if (celaviveRaffleMatch) {
    renderLoading('Loading Celavive raffle form...');

    try {
      const result = await fetchJson(`/public-events/${celaviveRaffleMatch[1]}`);

      if (!isCelaviveRaffleEvent(result.event)) {
        renderPage(renderErrorPage('Celavive raffle page unavailable.', 'This event does not have a Celavive raffle entry workflow.'));
        return;
      }

      renderPage(renderPublicCelaviveRafflePage(result.event));
      attachPublicShowcase();
      syncDynamicHeaderTitle();
      attachCelaviveRaffleHandlers(result.event);
    } catch (error) {
      renderPage(renderErrorPage('Unable to load that Celavive raffle page.', error.message));
    }

    return;
  }

  const wellnessQuizMatch = pathname.match(/^\/wellness-quiz\/([^/]+)$/);

  if (wellnessQuizMatch) {
    renderLoading('Loading wellness check...');

    try {
      const result = await fetchJson(`/public-events/${wellnessQuizMatch[1]}`);

      if (!isWellnessQuizEvent(result.event)) {
        renderPage(renderErrorPage('Wellness Quiz unavailable.', 'This event does not have a Wellness Quiz workflow.'));
        return;
      }

      renderPage(renderPublicWellnessQuizPage(result.event));
      attachPublicShowcase();
      syncDynamicHeaderTitle();
      attachWellnessQuizHandlers(result.event);
    } catch (error) {
      renderPage(renderErrorPage('Unable to load that Wellness Quiz.', error.message));
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
  const prospectScoreButton = event.target.closest('[data-prospect-score]');

  if (prospectScoreButton) {
    event.preventDefault();
    showProspectScoreInsight(prospectScoreButton);
    return;
  }

  const prospectInsightClose = event.target.closest('[data-prospect-insight-close]');

  if (prospectInsightClose) {
    event.preventDefault();
    closeProspectScoreInsight();
    return;
  }

  const prospectInsightBackdrop = event.target.closest('[data-prospect-insight-backdrop]');

  if (prospectInsightBackdrop && !event.target.closest('[data-prospect-insight-surface]')) {
    event.preventDefault();
    closeProspectScoreInsight();
    return;
  }

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

    if (closeProspectScoreInsight()) {
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

function showProspectScoreInsight(button) {
  let row = {};

  try {
    row = JSON.parse(button.dataset.prospectRow || '{}');
  } catch (error) {
    row = {};
  }

  const insight = buildCelaviveProspectInsight(row);
  const modal = ensureProspectScoreInsightModal();

  modal.querySelector('[data-prospect-insight-title]').textContent = insight.title;
  modal.querySelector('[data-prospect-insight-summary]').textContent = insight.summary;
  modal.querySelector('[data-prospect-insight-drivers]').innerHTML = insight.drivers
    .map((driver) => `<li>${escapeHtml(driver)}</li>`)
    .join('');
  modal.hidden = false;

  window.requestAnimationFrame(() => {
    modal.classList.add('is-open');
    const closeButton = modal.querySelector('[data-prospect-insight-close]');

    if (closeButton) {
      closeButton.focus();
    }
  });
}

function closeProspectScoreInsight() {
  const modal = document.getElementById('prospectScoreInsightModal');

  if (!modal || modal.hidden) {
    return false;
  }

  modal.classList.remove('is-open');

  window.setTimeout(() => {
    if (modal) {
      modal.hidden = true;
    }
  }, 180);

  return true;
}

function ensureProspectScoreInsightModal() {
  let modal = document.getElementById('prospectScoreInsightModal');

  if (modal) {
    return modal;
  }

  modal = document.createElement('div');
  modal.id = 'prospectScoreInsightModal';
  modal.className = 'prospect-insight-modal';
  modal.hidden = true;
  modal.setAttribute('data-prospect-insight-backdrop', '');
  modal.innerHTML = `
    <div class="prospect-insight-surface" data-prospect-insight-surface role="dialog" aria-modal="true" aria-labelledby="prospectScoreInsightTitle">
      <div class="prospect-insight-kicker">Score insight</div>
      <h2 id="prospectScoreInsightTitle" data-prospect-insight-title></h2>
      <p data-prospect-insight-summary></p>
      <ul class="prospect-insight-drivers" data-prospect-insight-drivers></ul>
      <button type="button" class="button-link prospect-insight-close" data-prospect-insight-close>Close</button>
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
  const eventTypeInput = form.querySelector('#eventType');
  const inBodySetup = document.getElementById('inBodyEventSetup');
  const inBodyModeInput = document.getElementById('inBodyMode');
  const inBodySlotBuilder = document.getElementById('inBodySlotBuilder');
  const inBodySlotRows = document.getElementById('inBodySlotRows');
  const addInBodySlotButton = form.querySelector('[data-add-inbody-slot]');
  const beautyCaravanSetup = document.getElementById('beautyCaravanEventSetup');
  const wellnessQuizSetup = document.getElementById('wellnessQuizEventSetup');
  const wellnessQuizTitleInput = document.getElementById('wellnessQuizTitle');

  const syncInBodySetup = () => {
    const isInBody = eventTypeInput && isInBodyEvent({ eventType: eventTypeInput.value });
    const isBeautyCaravan = eventTypeInput && isBeautyCaravanEvent({ eventType: eventTypeInput.value });
    const isWellnessQuiz = eventTypeInput && isWellnessQuizEvent({ eventType: eventTypeInput.value });
    const isBooking = isInBody && inBodyModeInput && inBodyModeInput.value === 'booking';

    if (inBodySetup) {
      inBodySetup.hidden = !isInBody;
    }

    if (beautyCaravanSetup) {
      beautyCaravanSetup.hidden = !isBeautyCaravan;
    }

    if (wellnessQuizSetup) {
      wellnessQuizSetup.hidden = !isWellnessQuiz;
    }

    if (wellnessQuizTitleInput) {
      wellnessQuizTitleInput.required = Boolean(isWellnessQuiz);
    }

    if (!isInBody && inBodyModeInput) {
      inBodyModeInput.value = 'raffle';
    }

    if (inBodySlotBuilder) {
      inBodySlotBuilder.hidden = !isBooking;
    }

    if (inBodySlotRows) {
      if (isBooking && !inBodySlotRows.querySelector('[data-inbody-slot-row]')) {
        inBodySlotRows.insertAdjacentHTML('beforeend', renderInBodySlotRow());
      }

      if (!isBooking) {
        inBodySlotRows.innerHTML = '';
      }
    }
  };

  if (eventTypeInput) {
    eventTypeInput.addEventListener('change', syncInBodySetup);
  }

  if (inBodyModeInput) {
    inBodyModeInput.addEventListener('change', syncInBodySetup);
  }

  if (addInBodySlotButton && inBodySlotRows) {
    addInBodySlotButton.addEventListener('click', () => {
      if (inBodySlotBuilder && inBodySlotBuilder.hidden) {
        return;
      }

      inBodySlotRows.insertAdjacentHTML('beforeend', renderInBodySlotRow());
    });
  }

  if (inBodySlotRows) {
    inBodySlotRows.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-inbody-slot]');

      if (!removeButton) {
        return;
      }

      const rows = Array.from(inBodySlotRows.querySelectorAll('[data-inbody-slot-row]'));

      if (rows.length <= 1) {
        rows[0].querySelectorAll('input').forEach((input) => {
          input.value = input.name === 'inBodySlotCapacity' ? '1' : '';
        });
        return;
      }

      removeButton.closest('[data-inbody-slot-row]').remove();
    });
  }

  syncInBodySetup();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const status = document.getElementById('eventStatus');
    const isInBody = isInBodyEvent({ eventType: form.eventType.value });
    const isBeautyCaravan = isBeautyCaravanEvent({ eventType: form.eventType.value });
    const isWellnessQuiz = isWellnessQuizEvent({ eventType: form.eventType.value });
    const body = {
      eventType: form.eventType.value,
      location: form.location.value,
      dateTime: form.dateTime.value
    };

    if (isInBody) {
      body.inBodyMode = form.inBodyMode.value;
      body.inBodySlots = body.inBodyMode === 'booking' ? collectInBodySlotRows(form) : [];
    }

    if (isBeautyCaravan) {
      body.beautyCaravanSchedule = {
        date: form.beautyCaravanSlotDate.value,
        startTime: form.beautyCaravanSlotStart.value,
        endTime: form.beautyCaravanSlotEnd.value
      };
    }

    if (isWellnessQuiz) {
      body.wellnessQuizTitle = form.wellnessQuizTitle.value;
    }

    setStatus(status, '', '');

    try {
      setButtonLoading(submitButton, true, 'Creating event...');
      const result = await fetchJson('/events', {
        method: 'POST',
        body
      });

      navigate(`/events/${result.event.eventId}`, true);
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, 'Create Event');
    }
  });
}

function collectInBodySlotRows(form) {
  return Array.from(form.querySelectorAll('[data-inbody-slot-row]')).map((row) => ({
    date: row.querySelector('[name="inBodySlotDate"]').value,
    endDate: row.querySelector('[name="inBodySlotEndDate"]').value,
    startTime: row.querySelector('[name="inBodySlotStart"]').value,
    endTime: row.querySelector('[name="inBodySlotEnd"]').value,
    capacity: row.querySelector('[name="inBodySlotCapacity"]').value
  }));
}

function attachEventDetailHandlers(eventData) {
  syncDynamicHeaderTitle();
  const qrImage = document.getElementById('qrImage');
  const qrOpenLink = document.getElementById('qrOpenLink');
  const inBodyQrImage = document.getElementById('inBodyQrImage');
  const inBodyQrOpenLink = document.getElementById('inBodyQrOpenLink');
  const celaviveRaffleQrImage = document.getElementById('celaviveRaffleQrImage');
  const celaviveRaffleQrOpenLink = document.getElementById('celaviveRaffleQrOpenLink');
  const wellnessQuizQrImage = document.getElementById('wellnessQuizQrImage');
  const wellnessQuizQrOpenLink = document.getElementById('wellnessQuizQrOpenLink');
  const rsvpUrl = `${window.location.origin}${eventData.rsvpPath}`;
  const inBodyUrl = eventData.inBodyPath ? `${window.location.origin}${eventData.inBodyPath}` : '';
  const celaviveRaffleUrl = eventData.celaviveRafflePath ? `${window.location.origin}${eventData.celaviveRafflePath}` : '';
  const wellnessQuizUrl = eventData.wellnessQuizPath ? `${window.location.origin}${eventData.wellnessQuizPath}` : '';

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

  if (inBodyQrImage && inBodyUrl) {
    inBodyQrImage.src = buildQrUrl(inBodyUrl);
    inBodyQrImage.alt = `Branded QR code for ${eventData.eventLabel} InBody`;
  }

  if (inBodyQrOpenLink && inBodyUrl) {
    inBodyQrOpenLink.href = buildQrUrl(inBodyUrl);
    inBodyQrOpenLink.addEventListener('click', (event) => {
      event.preventDefault();
      openBrandedQrTab({ ...eventData, eventLabel: `${eventData.eventLabel} InBody` }, inBodyUrl);
    });
  }

  if (celaviveRaffleQrImage && celaviveRaffleUrl) {
    celaviveRaffleQrImage.src = buildQrUrl(celaviveRaffleUrl);
    celaviveRaffleQrImage.alt = `Branded QR code for ${eventData.eventLabel} Celavive raffle`;
  }

  if (celaviveRaffleQrOpenLink && celaviveRaffleUrl) {
    celaviveRaffleQrOpenLink.href = buildQrUrl(celaviveRaffleUrl);
    celaviveRaffleQrOpenLink.addEventListener('click', (event) => {
      event.preventDefault();
      openBrandedQrTab({ ...eventData, eventLabel: `${eventData.eventLabel} Celavive Raffle` }, celaviveRaffleUrl);
    });
  }

  if (wellnessQuizQrImage && wellnessQuizUrl) {
    wellnessQuizQrImage.src = buildQrUrl(wellnessQuizUrl);
    wellnessQuizQrImage.alt = `Branded QR code for ${eventData.eventLabel} Wellness Quiz`;
  }

  if (wellnessQuizQrOpenLink && wellnessQuizUrl) {
    wellnessQuizQrOpenLink.href = buildQrUrl(wellnessQuizUrl);
    wellnessQuizQrOpenLink.addEventListener('click', (event) => {
      event.preventDefault();
      openBrandedQrTab({ ...eventData, eventLabel: eventData.wellnessQuizTitle }, wellnessQuizUrl);
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
  const inBodyAcceptingButton = document.getElementById('toggleInBodyAcceptingButton');
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
            action: isCelaviveRaffleEvent(eventData) ? 'celavive-entry-settings' : 'rsvp-settings',
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

  if (inBodyAcceptingButton) {
    inBodyAcceptingButton.addEventListener('click', async () => {
      const nextAccepting = inBodyAcceptingButton.getAttribute('data-next-accepting') === 'true';

      setStatus(managementStatus, '', '');

      try {
        setButtonLoading(inBodyAcceptingButton, true, nextAccepting ? 'Unlocking...' : 'Locking...');
        const result = await fetchJson(`/events/${eventData.eventId}`, {
          method: 'PATCH',
          body: {
            action: 'inbody-settings',
            inBodyAccepting: nextAccepting
          }
        });

        setStatus(managementStatus, result.message, 'is-success');
        navigate(`/events/${encodeURIComponent(result.event.eventId)}`, true);
      } catch (error) {
        setStatus(managementStatus, error.message, 'is-error');
      } finally {
        setButtonLoading(inBodyAcceptingButton, false, nextAccepting ? 'Unlock Sign-ups' : 'Lock Sign-ups');
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
          attendanceConfirmation: form.attendanceConfirmation.value,
          slotId: form.slotId ? form.slotId.value : ''
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

function attachInBodyHandlers(eventData) {
  const form = document.getElementById('publicInBodyForm');

  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('publicFormStatus');
    const submitButton = form.querySelector('button[type="submit"]');

    setStatus(status, '', '');

    try {
      setButtonLoading(submitButton, true, eventData.inBodyMode === 'booking' ? 'Booking...' : 'Submitting...');
      const result = await fetchJson(`/events/${eventData.eventId}/inbody`, {
        method: 'POST',
        body: {
          fullName: form.fullName.value,
          emailAddress: form.emailAddress.value,
          mobileNumber: form.mobileNumber.value,
          profession: form.profession.value,
          invitedBy: form.invitedBy.value,
          slotId: form.slotId ? form.slotId.value : ''
        }
      });

      form.reset();
      setStatus(status, result.message, 'is-success');
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, eventData.inBodyMode === 'booking' ? 'Book Assessment' : 'Submit Entry');
    }
  });
}

function attachCelaviveRaffleHandlers(eventData) {
  const form = document.getElementById('publicCelaviveRaffleForm');

  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('publicFormStatus');
    const submitButton = form.querySelector('button[type="submit"]');
    const topSkinConcerns = Array.from(form.querySelectorAll('input[name="topSkinConcerns"]:checked')).map((input) => input.value);

    setStatus(status, '', '');

    try {
      setButtonLoading(submitButton, true, 'Submitting...');
      const result = await fetchJson(`/events/${eventData.eventId}/celavive-raffle`, {
        method: 'POST',
        body: {
          name: form.name.value,
          contactNumber: form.contactNumber.value,
          emailAddress: form.emailAddress.value,
          profession: form.profession.value,
          invitedBy: form.invitedBy.value,
          topSkinConcerns,
          skinType: form.skinType.value,
          skincareImportance: form.skincareImportance.value,
          buyingFrequency: form.buyingFrequency.value,
          currentRoutine: form.currentRoutine.value,
          monthlySpend: form.monthlySpend.value,
          desiredResult: form.desiredResult.value,
          premiumExperience: form.premiumExperience.value,
          willingnessToInvest: form.willingnessToInvest.value,
          personalizedExperienceInterest: form.personalizedExperienceInterest.value
        }
      });

      form.reset();
      setStatus(status, result.message, 'is-success');
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, 'Submit Raffle Entry');
    }
  });
}

function attachWellnessQuizHandlers(eventData) {
  const form = document.getElementById('publicWellnessQuizForm');

  if (!form) {
    return;
  }

  const concernInputs = Array.from(form.querySelectorAll('input[name="currentConcerns"]'));
  concernInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const noneInput = concernInputs.find((item) => item.value === 'None of the Above');

      if (input.value === 'None of the Above' && input.checked) {
        concernInputs.filter((item) => item !== input).forEach((item) => { item.checked = false; });
      } else if (input.checked && noneInput) {
        noneInput.checked = false;
      }
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('publicFormStatus');
    const submitButton = form.querySelector('button[type="submit"]');
    const currentConcerns = concernInputs.filter((input) => input.checked).map((input) => input.value);

    if (!currentConcerns.length) {
      setStatus(status, 'Choose at least one current health concern.', 'is-error');
      return;
    }

    setStatus(status, '', '');

    try {
      setButtonLoading(submitButton, true, 'Submitting...');
      const result = await fetchJson(`/events/${eventData.eventId}/wellness-quiz`, {
        method: 'POST',
        body: {
          name: form.name.value,
          age: form.age.value,
          mobileNumber: form.mobileNumber.value,
          currentConcerns,
          healthRating: form.healthRating.value,
          healthGoal: form.healthGoal.value,
          consultationInterest: form.consultationInterest.value,
          comments: form.comments.value
        }
      });

      form.reset();
      setStatus(status, result.message, 'is-success');
    } catch (error) {
      setStatus(status, error.message, 'is-error');
    } finally {
      setButtonLoading(submitButton, false, 'Submit Wellness Check');
    }
  });
}

function attachInBodyResponseHandlers(eventData) {
  document.querySelectorAll('[data-inbody-reschedule-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const rowNumber = form.getAttribute('data-row-number');
      const status = form.querySelector('.status');
      const submitButton = form.querySelector('button[type="submit"]');

      setStatus(status, '', '');

      try {
        setButtonLoading(submitButton, true, 'Updating...');
        const result = await fetchJson(`/events/${eventData.eventId}/inbody-responses/${rowNumber}`, {
          method: 'PATCH',
          body: {
            slotId: form.slotId.value
          }
        });

        setStatus(status, result.message, 'is-success');
        window.setTimeout(() => navigate(`/events/${encodeURIComponent(eventData.eventId)}/inbody-responses`, true), 450);
      } catch (error) {
        setStatus(status, error.message, 'is-error');
      } finally {
        setButtonLoading(submitButton, false, 'Update Slot');
      }
    });
  });
}

function attachResponseDeleteHandlers(eventData, mode) {
  document.querySelectorAll('[data-delete-response-row]').forEach((button) => {
    button.addEventListener('click', async () => {
      const rowNumber = button.getAttribute('data-row-number');
      const responseName = button.getAttribute('data-response-name') || 'this entry';
      const confirmed = await showConfirmModal({
        title: 'Delete this entry?',
        message: `This removes ${responseName} from the ${getResponseModeLabel(mode)} response sheet.`,
        confirmLabel: 'Delete Entry',
        tone: 'danger'
      });

      if (!confirmed) {
        return;
      }

      try {
        setButtonLoading(button, true, 'Deleting...');
        await fetchJson(`/events/${eventData.eventId}/responses/${mode}/${rowNumber}`, {
          method: 'DELETE'
        });
        navigate(window.location.pathname, true);
      } catch (error) {
        const status = document.getElementById('responseActionStatus');
        setStatus(status, error.message, 'is-error');
      } finally {
        setButtonLoading(button, false, 'Delete');
      }
    });
  });
}

function attachPublicShowcase() {
  const image = document.getElementById('publicHeroSlideshowImage');
  const dots = document.getElementById('publicHeroSlideshowDots');
  const slides = image && image.dataset.slideshow === 'inbody' ? publicInBodySlides : publicCelaviveSlides;

  if (!image || !dots || !slides.length) {
    return;
  }

  if (state.publicSlideshowTimer) {
    window.clearInterval(state.publicSlideshowTimer);
    state.publicSlideshowTimer = null;
  }

  dots.innerHTML = slides
    .map((_, index) => `<span class="public-slideshow-dot${index === 0 ? ' is-active' : ''}"></span>`)
    .join('');

  const dotElements = [...dots.querySelectorAll('.public-slideshow-dot')];
  let currentIndex = 0;

  image.src = slides[0];
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
      image.src = slides[currentIndex];
      image.classList.add('is-visible');
      dotElements.forEach((dot, dotIndex) => {
        dot.classList.toggle('is-active', dotIndex === currentIndex);
      });
    }, 120);
  };

  state.publicSlideshowTimer = window.setInterval(() => {
    currentIndex = (currentIndex + 1) % slides.length;
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
                  ${state.config.eventTypes.map((type) => `<option value="${escapeAttribute(type)}">${escapeHtml(getEventTypeDisplayLabel(type))}</option>`).join('')}
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
            <div id="wellnessQuizEventSetup" class="field full" hidden>
              <label for="wellnessQuizTitle">Wellness Quiz Title <span class="required">*</span></label>
              <input id="wellnessQuizTitle" name="wellnessQuizTitle" type="text" placeholder="CAMP EVANGELISTA WELLNESS CHECK">
              <span class="field-help">This title appears at the top of the public wellness check.</span>
            </div>
            <div id="beautyCaravanEventSetup" class="field full beauty-caravan-event-setup" hidden>
              <div class="inbody-setup-head">
                <div>
                  <span class="section-kicker">Beauty Caravan workflow</span>
                  <h3>Hourly RSVP slots</h3>
                </div>
              </div>
              <div class="grid beauty-caravan-slot-grid">
                <div class="field">
                  <label for="beautyCaravanSlotDate">Slot Date <span class="required">*</span></label>
                  <input id="beautyCaravanSlotDate" name="beautyCaravanSlotDate" type="date">
                </div>
                <div class="field">
                  <label for="beautyCaravanSlotStart">Start Time <span class="required">*</span></label>
                  <input id="beautyCaravanSlotStart" name="beautyCaravanSlotStart" type="time">
                </div>
                <div class="field">
                  <label for="beautyCaravanSlotEnd">End Time <span class="required">*</span></label>
                  <input id="beautyCaravanSlotEnd" name="beautyCaravanSlotEnd" type="time">
                </div>
              </div>
            </div>
            <div id="inBodyEventSetup" class="field full inbody-event-setup" hidden>
              <div class="inbody-setup-head">
                <div>
                  <span class="section-kicker">InBody workflow</span>
                  <h3>Wellness Assessment setup</h3>
                </div>
              </div>
              <div class="grid">
                <div class="field full">
                  <label for="inBodyMode">QR Workflow</label>
                  <select id="inBodyMode" name="inBodyMode">
                    <option value="raffle">Raffle Entry</option>
                    <option value="booking">Open Booking</option>
                  </select>
                </div>
              </div>
              <div id="inBodySlotBuilder" class="inbody-slot-builder" hidden>
                <div class="inbody-slot-builder-head">
                  <strong>Bookable schedules</strong>
                  <button type="button" class="button-link button-link-secondary" data-add-inbody-slot>Add Slot</button>
                </div>
                <div id="inBodySlotRows" class="inbody-slot-rows"></div>
              </div>
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

function renderInBodySlotRow(slot = {}) {
  return `
    <div class="inbody-slot-row" data-inbody-slot-row>
      <div class="field">
        <label>Start Date</label>
        <input name="inBodySlotDate" type="date" value="${escapeAttribute(slot.date || '')}">
      </div>
      <div class="field">
        <label>End Date</label>
        <input name="inBodySlotEndDate" type="date" value="${escapeAttribute(slot.endDate || slot.date || '')}">
      </div>
      <div class="field">
        <label>Start Time</label>
        <input name="inBodySlotStart" type="time" value="${escapeAttribute(slot.startTime || '')}">
      </div>
      <div class="field">
        <label>End Time</label>
        <input name="inBodySlotEnd" type="time" value="${escapeAttribute(slot.endTime || '')}">
      </div>
      <div class="field">
        <label>Capacity</label>
        <input name="inBodySlotCapacity" type="number" min="1" step="1" inputmode="numeric" value="${escapeAttribute(slot.capacity || '1')}">
      </div>
      <button type="button" class="button-link button-link-secondary inbody-slot-remove" data-remove-inbody-slot aria-label="Remove schedule slot">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 7H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M10 11V17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M14 11V17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M9 7L9.6 5.6C9.9 4.9 10.5 4.5 11.2 4.5H12.8C13.5 4.5 14.1 4.9 14.4 5.6L15 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M7.5 7L8.2 19.1C8.3 20 9 20.5 9.9 20.5H14.1C15 20.5 15.7 20 15.8 19.1L16.5 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  `;
}

function renderEventDetailPage(eventData, previews = {}) {
  const isInBody = isInBodyEvent(eventData);
  const isCelaviveRaffle = isCelaviveRaffleEvent(eventData);
  const isWellnessQuiz = isWellnessQuizEvent(eventData);
  const rsvpUrl = `${window.location.origin}${eventData.rsvpPath}`;
  const attendanceUrl = `${window.location.origin}${eventData.attendancePath}`;
  const inBodyUrl = eventData.inBodyPath ? `${window.location.origin}${eventData.inBodyPath}` : '';
  const celaviveRaffleUrl = eventData.celaviveRafflePath ? `${window.location.origin}${eventData.celaviveRafflePath}` : '';
  const wellnessQuizUrl = eventData.wellnessQuizPath ? `${window.location.origin}${eventData.wellnessQuizPath}` : '';
  const inBodyCount = (previews.inBodyResponses || []).length;
  const celaviveRaffleCount = (previews.celaviveRaffleResponses || []).length;
  const wellnessQuizCount = (previews.wellnessQuizResponses || []).length;
  const rsvpPreviewRows = buildResponsePreviewRows(previews.rsvpResponses || [], 'rsvp');
  const attendancePreviewRows = buildResponsePreviewRows(previews.attendanceResponses || [], 'attendance');
  const inBodyPreviewRows = buildResponsePreviewRows(previews.inBodyResponses || [], 'inbody');
  const celaviveRafflePreviewRows = buildResponsePreviewRows(previews.celaviveRaffleResponses || [], 'celavive-raffle');
  const wellnessQuizPreviewRows = buildResponsePreviewRows(previews.wellnessQuizResponses || [], 'wellness-quiz');

  return renderAdminFrame({
    activeView: eventData.isArchived ? 'archive' : 'dashboard',
    user: state.session,
    title: eventData.eventType,
    titleClass: eventData.isArchived ? '' : 'admin-title-dynamic',
    subtitle: eventData.isArchived
      ? 'Review this completed event and its published response history.'
      : 'Share RSVP, capture attendance, and review responses from one event workspace.',
    badge: eventData.isArchived ? eventData.eventType : 'Event',
    headerDetails: renderEventHeaderControls(eventData),
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
                eventData.isArchived || isInBody || isWellnessQuiz
                  ? ''
                  : `
                    <button id="openRsvpSettingsButton" type="button" class="button-link button-link-secondary rsvp-settings-open-button">
                      ${escapeHtml(isCelaviveRaffle ? 'Entry Settings' : 'RSVP Settings')}
                    </button>
                  `
              }
            </div>
            <div class="detail-link-grid">
              ${
                isInBody || isCelaviveRaffle || isWellnessQuiz
                  ? ''
                  : `
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
                  `
              }
              ${
                isInBody
                  ? `
                    <div class="link-stack modern-link-stack">
                      <label>InBody Link</label>
                      ${renderEventUrlControl({
                        url: inBodyUrl,
                        openHref: eventData.inBodyPath,
                        copyLabel: 'InBody link',
                        openLabel: 'Open InBody'
                      })}
                    </div>
                  `
                  : ''
              }
              ${
                isCelaviveRaffle
                  ? `
                    <div class="link-stack modern-link-stack">
                      <label>Celavive Raffle Link</label>
                      ${renderEventUrlControl({
                        url: celaviveRaffleUrl,
                        openHref: eventData.celaviveRafflePath,
                        copyLabel: 'Celavive raffle link',
                        openLabel: 'Open Celavive raffle'
                      })}
                    </div>
                  `
                  : ''
              }
              ${
                isWellnessQuiz
                  ? `
                    <div class="link-stack modern-link-stack">
                      <label>Wellness Quiz Link</label>
                      ${renderEventUrlControl({
                        url: wellnessQuizUrl,
                        openHref: eventData.wellnessQuizPath,
                        copyLabel: 'Wellness Quiz link',
                        openLabel: 'Open Wellness Quiz'
                      })}
                    </div>
                  `
                  : ''
              }
            </div>
            <div id="eventActionStatus" class="status event-link-status" aria-live="polite"></div>
            <div class="event-link-grid detail-response-grid detail-response-grid-inline">
              ${
                isInBody || isCelaviveRaffle || isWellnessQuiz
                  ? ''
                  : `
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
                  `
              }
              ${
                isInBody
                  ? `
                    <a href="/events/${encodeURIComponent(eventData.eventId)}/inbody-responses" data-link class="action-card">
                      <div class="detail-response-card-head">
                        <strong>View all InBody responses</strong>
                        <span class="detail-response-count">${inBodyCount}</span>
                      </div>
                      <span>${escapeHtml(eventData.inBodyMode === 'booking' ? 'Latest assessment bookings.' : 'Latest raffle entries.')}</span>
                      ${renderResponsePreviewList(inBodyPreviewRows, 'inbody')}
                    </a>
                  `
                  : ''
              }
              ${
                isCelaviveRaffle
                  ? `
                    <a href="/events/${encodeURIComponent(eventData.eventId)}/celavive-raffle-responses" data-link class="action-card">
                      <div class="detail-response-card-head">
                        <strong>View all Celavive raffle responses</strong>
                        <span class="detail-response-count">${celaviveRaffleCount}</span>
                      </div>
                      <span>Latest skin profile entries with prospect scoring.</span>
                      ${renderResponsePreviewList(celaviveRafflePreviewRows, 'celavive-raffle')}
                    </a>
                  `
                  : ''
              }
              ${
                isWellnessQuiz
                  ? `
                    <a href="/events/${encodeURIComponent(eventData.eventId)}/wellness-quiz-responses" data-link class="action-card">
                      <div class="detail-response-card-head">
                        <strong>View all Wellness Quiz responses</strong>
                        <span class="detail-response-count">${wellnessQuizCount}</span>
                      </div>
                      <span>Latest wellness check submissions.</span>
                      ${renderResponsePreviewList(wellnessQuizPreviewRows, 'wellness-quiz')}
                    </a>
                  `
                  : ''
              }
            </div>
          </section>
        </div>

        <aside class="detail-side-stack">
          ${
            isInBody || isCelaviveRaffle || isWellnessQuiz
              ? ''
              : `
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
              `
          }
          ${
            isInBody
              ? `
                <section class="workspace-panel qr-card qr-card-active">
                  <div class="inbody-qr-card-head">
                    <div>
                      <span class="section-kicker">InBody QR</span>
                      <h3>${escapeHtml(eventData.inBodyMode === 'booking' ? 'Booking QR code' : 'Raffle QR code')}</h3>
                    </div>
                    <span class="inbody-signup-state ${eventData.inBodyAccepting ? 'is-open' : 'is-locked'}">${eventData.inBodyAccepting ? 'Open' : 'Locked'}</span>
                  </div>
                  <p>${escapeHtml(eventData.inBodyAccepting
                    ? eventData.inBodyMode === 'booking'
                      ? 'Share this QR so attendees can book an assessment slot.'
                      : 'Share this QR so attendees can join the InBody raffle entry list.'
                    : 'The public InBody link is locked and will not accept new sign-ups.')}</p>
                  <div class="qr-panel">
                    <div class="qr-image-stack">
                      <img id="inBodyQrImage" class="qr-image" alt="InBody QR code">
                      <img class="qr-brand-mark" src="/assets/logo/Genesys_Logo2.svg" alt="" aria-hidden="true">
                    </div>
                  </div>
                  <div class="inbody-qr-actions">
                    <a id="inBodyQrOpenLink" class="button-link button-link-secondary" target="_blank" rel="noreferrer" href="${escapeAttribute(buildQrUrl(inBodyUrl))}">Open QR in new tab</a>
                    <button
                      id="toggleInBodyAcceptingButton"
                      type="button"
                      class="button-link button-link-secondary inbody-lock-button ${eventData.inBodyAccepting ? 'is-locked-action' : 'is-open-action'}"
                      data-next-accepting="${eventData.inBodyAccepting ? 'false' : 'true'}"
                    >
                      ${renderLockIcon(eventData.inBodyAccepting ? 'closed' : 'open')}
                      <span>${eventData.inBodyAccepting ? 'Lock Sign-ups' : 'Unlock Sign-ups'}</span>
                    </button>
                  </div>
                </section>
              `
              : ''
          }
          ${
            isCelaviveRaffle
              ? `
                <section class="workspace-panel qr-card qr-card-active">
                  <span class="section-kicker">Celavive raffle QR</span>
                  <h3>Raffle Entry QR code</h3>
                  <p>Share this QR so guests can complete their skin profile before submitting a raffle entry.</p>
                  <div class="qr-panel">
                    <div class="qr-image-stack">
                      <img id="celaviveRaffleQrImage" class="qr-image" alt="Celavive raffle QR code">
                      <img class="qr-brand-mark" src="/assets/logo/Genesys_Logo2.svg" alt="" aria-hidden="true">
                    </div>
                  </div>
                  <a id="celaviveRaffleQrOpenLink" class="button-link button-link-secondary" target="_blank" rel="noreferrer" href="${escapeAttribute(buildQrUrl(celaviveRaffleUrl))}">Open QR in new tab</a>
                </section>
              `
              : ''
          }
          ${
            isWellnessQuiz
              ? `
                <section class="workspace-panel qr-card qr-card-active">
                  <span class="section-kicker">Wellness Quiz QR</span>
                  <h3>Wellness Check QR code</h3>
                  <p>Share this QR so guests can complete the wellness questionnaire.</p>
                  <div class="qr-panel">
                    <div class="qr-image-stack">
                      <img id="wellnessQuizQrImage" class="qr-image" alt="Wellness Quiz QR code">
                      <img class="qr-brand-mark" src="/assets/logo/Genesys_Logo2.svg" alt="" aria-hidden="true">
                    </div>
                  </div>
                  <a id="wellnessQuizQrOpenLink" class="button-link button-link-secondary" target="_blank" rel="noreferrer" href="${escapeAttribute(buildQrUrl(wellnessQuizUrl))}">Open QR in new tab</a>
                </section>
              `
              : ''
          }
        </aside>
      </section>
      ${eventData.isArchived || isInBody || isWellnessQuiz ? '' : renderRsvpSettingsModal(eventData)}
    `
  });
}

function renderRsvpSettingsModal(eventData) {
  const isEntrySettings = isCelaviveRaffleEvent(eventData);
  const availability = isEntrySettings ? eventData.celaviveRaffleAvailability || {} : eventData.rsvpAvailability || {};
  const maxYes = eventData.rsvpMaxYes || availability.maxEntries || availability.maxYes || '';
  const currentCount = isEntrySettings
    ? Number.isFinite(availability.entryCount) ? availability.entryCount : 0
    : Number.isFinite(availability.yesCount) ? availability.yesCount : 0;
  const title = isEntrySettings ? 'Entry Settings' : 'RSVP Settings';
  const kicker = isEntrySettings ? 'Entry controls' : 'RSVP controls';
  const toggleLabel = isEntrySettings ? 'Accept Entries' : 'Accept RSVPs';
  const countLabel = isEntrySettings
    ? `${currentCount} raffle entr${currentCount === 1 ? 'y' : 'ies'} so far.`
    : `${currentCount} accepted Yes RSVP${currentCount === 1 ? '' : 's'} so far.`;
  const maxLabel = isEntrySettings ? 'Max raffle entries' : 'Max accepted Yes RSVPs';
  const maxPlaceholder = isEntrySettings ? 'Example: 6' : 'Example: 20';

  return `
    <div id="rsvpSettingsModal" class="rsvp-settings-modal" hidden>
      <section class="rsvp-settings-surface" role="dialog" aria-modal="true" aria-labelledby="rsvpSettingsTitle">
        <div class="rsvp-settings-head">
          <div>
            <span class="section-kicker">${escapeHtml(kicker)}</span>
            <h2 id="rsvpSettingsTitle">${escapeHtml(title)}</h2>
            <p>${escapeHtml(countLabel)}</p>
          </div>
          <button type="button" class="rsvp-settings-close" data-close-rsvp-settings aria-label="Close ${escapeAttribute(title.toLowerCase())}">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 7L17 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
              <path d="M17 7L7 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <form id="rsvpSettingsForm" class="rsvp-settings-form">
          <label class="rsvp-toggle-row" for="rsvpAccepting">
            <span>
              <strong>${escapeHtml(toggleLabel)}</strong>
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
            <label for="rsvpMaxYes">${escapeHtml(maxLabel)}</label>
            <input id="rsvpMaxYes" name="rsvpMaxYes" type="number" min="1" step="1" inputmode="numeric" value="${escapeAttribute(maxYes)}" placeholder="${escapeAttribute(maxPlaceholder)}">
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
              <div id="responseActionStatus" class="status response-action-status" aria-live="polite"></div>
              ${renderTable(columns, responses, mode)}
              ${mode === 'rsvp' ? renderMobileRsvpResponses(columns, responses) : ''}
              ${mode === 'inbody' && eventData.inBodyMode === 'booking' ? renderInBodyReschedulePanel(eventData, responses) : ''}
            `
            : `
              <div class="empty-state empty-state-modern">
                <strong>No responses yet.</strong>
                <span>This event has not collected any ${mode === 'rsvp' ? 'RSVP' : mode === 'inbody' ? 'InBody' : mode === 'celavive-raffle' ? 'Celavive raffle' : 'attendance'} entries so far.</span>
              </div>
            `
        }
      </section>
    `
  });
}

function renderInBodyReschedulePanel(eventData, responses) {
  const slots = ((eventData.inBodyAvailability && eventData.inBodyAvailability.slots) || eventData.inBodySlots || []);

  if (!slots.length) {
    return '';
  }

  return `
    <section class="inbody-reschedule-panel">
      <div class="workspace-heading">
        <div>
          <span class="section-kicker">Booking control</span>
          <h2>Reschedule bookings</h2>
        </div>
      </div>
      <div class="inbody-reschedule-list">
        ${responses
          .map((row) => {
            const rowNumber = row.__rowNumber || '';
            const currentSlotId = row['Slot ID'] || '';

            return `
              <form class="inbody-reschedule-row" data-inbody-reschedule-form data-row-number="${escapeAttribute(rowNumber)}">
                <div>
                  <strong>${escapeHtml(row['Full Name'] || 'Unknown attendee')}</strong>
                  <span>${escapeHtml(row['Slot Label'] || 'No slot assigned')}</span>
                </div>
                <select name="slotId" required>
                  ${slots
                    .map((slot) => {
                      const disabled = slot.isFull && slot.slotId !== currentSlotId ? ' disabled' : '';
                      const selected = slot.slotId === currentSlotId ? ' selected' : '';
                      const suffix = Number.isFinite(slot.remaining) ? ` (${slot.remaining} left)` : '';
                      return `<option value="${escapeAttribute(slot.slotId)}"${selected}${disabled}>${escapeHtml((slot.label || formatSlotLabel(slot)) + suffix)}</option>`;
                    })
                    .join('')}
                </select>
                <button type="submit" class="button-link button-link-secondary">Update Slot</button>
                <div class="status" aria-live="polite"></div>
              </form>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
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

function renderLockIcon(state) {
  if (state === 'open') {
    return `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5.5" y="10" width="13" height="10" rx="2.4" stroke="currentColor" stroke-width="1.8"/>
        <path d="M8.5 10V7.5C8.5 5.6 10 4.1 12 4.1C13.4 4.1 14.6 4.9 15.2 6.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5.5" y="10" width="13" height="10" rx="2.4" stroke="currentColor" stroke-width="1.8"/>
      <path d="M8.5 10V7.5C8.5 5.6 10 4.1 12 4.1C14 4.1 15.5 5.6 15.5 7.5V10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `;
}

function renderEventHeaderControls(eventData) {
  const isArchived = Boolean(eventData && eventData.isArchived);
  const archiveAction = isArchived ? 'unarchive' : 'archive';
  const archiveLabel = isArchived ? 'Move Active' : 'Archive';

  return `
    <form id="eventScheduleForm" class="event-header-schedule-form">
      <div class="event-header-schedule-field">
        <label for="manageDateTime">${isArchived ? 'Update date to reactivate' : 'Reschedule event'}</label>
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
          <span>${isArchived ? 'Update Date' : 'Update'}</span>
        </button>
        <button
          id="toggleArchiveEventButton"
          type="button"
          class="button-link button-link-secondary event-header-action-button"
          data-event-action="${archiveAction}"
        >
          <span class="event-header-action-icon">${renderEventActionIcon('archive')}</span>
          <span>${archiveLabel}</span>
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
  const slotLabel = row['Slot Label'] || '';

  return {
    name: row['Full Name'] || row['Full Name of Attendee'] || 'Unknown attendee',
    invitedBy: row['Invited By'] || row['Name of the person who invited you'] || 'Not provided',
    meta: slotLabel ? `Slot: ${slotLabel}` : `Invited by ${row['Invited By'] || row['Name of the person who invited you'] || 'Not provided'}`
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
                  <span class="mobile-rsvp-response-invited">${escapeHtml(summary.meta)}</span>
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
  return responses.slice(0, 3).map((row) => {
    const hasRsvpSlot = mode === 'rsvp' && row['Slot Label'];

    return {
      name: row['Name'] || row['Full Name'] || row['Full Name of Attendee'] || 'Unknown attendee',
      metaLabel: hasRsvpSlot ? 'Slot' : mode === 'rsvp' ? 'Invited by' : mode === 'inbody' ? 'Slot' : mode === 'celavive-raffle' ? 'Tier' : mode === 'wellness-quiz' ? 'Rating' : 'Profession',
      metaValue:
        hasRsvpSlot
          ? row['Slot Label']
          : mode === 'rsvp'
            ? row['Invited By'] || row['Name of the person who invited you'] || 'Not provided'
            : mode === 'inbody'
              ? row['Slot Label'] || row['Booking Status'] || row['InBody Mode'] || 'InBody response'
          : mode === 'celavive-raffle'
            ? row['Prospect Tier'] || row['Prospect Score'] || row['Contact Number'] || 'Skin profile'
          : mode === 'wellness-quiz'
            ? row['Health Rating'] || row['Mobile Number'] || 'Wellness check'
          : row['Profession'] || row['Email Address'] || row['Mobile Number'] || 'Attendance registration'
    };
  });
}

function renderResponsePreviewList(rows, mode) {
  if (!rows.length) {
    return `
      <div class="response-preview-list is-empty">
        <div class="response-preview-item">
          <span class="response-preview-name">No ${mode === 'rsvp' ? 'RSVP' : mode === 'inbody' ? 'InBody' : mode === 'celavive-raffle' ? 'Celavive raffle' : mode === 'wellness-quiz' ? 'Wellness Quiz' : 'attendance'} responses yet</span>
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
                <span class="response-preview-meta">${escapeHtml(row.metaLabel)} ${escapeHtml(row.metaValue)}</span>
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
  const fallbackColumns = mode === 'rsvp'
    ? rsvpColumnFallback()
    : mode === 'inbody'
      ? inBodyColumnFallback()
      : mode === 'celavive-raffle'
        ? celaviveRaffleColumnFallback()
        : mode === 'wellness-quiz'
          ? wellnessQuizColumnFallback()
        : attendanceColumnFallback();
  const sourceColumns = responses.length ? Object.keys(responses[0]) : fallbackColumns;
  const visibleColumns = sourceColumns.filter((column) => !hiddenColumns.has(column));

  if (mode !== 'celavive-raffle' || !responses.length) {
    return visibleColumns;
  }

  const priorityColumns = celaviveRaffleColumnFallback();
  return priorityColumns.filter((column) => visibleColumns.includes(column));
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
          ${rsvpClosed ? renderPublicRsvpClosedCard(eventData, availability) : renderPublicFormCard(isRsvp, eventData)}
        </section>
      </div>
    </div>
  `;
}

function renderPublicInBodyPage(eventData) {
  const isBooking = eventData.inBodyMode === 'booking';
  const eventDateTime = eventData.displayDateTime || formatMetricDateTime(eventData.dateTime);
  const title = isBooking ? 'Wellness Assessment Booking' : 'Wellness Assessment Raffle';
  const lede = isBooking
    ? 'Choose your preferred assessment slot and submit your details.'
    : 'Submit your details as your raffle entry for a wellness assessment.';

  return `
    <div class="page public-page">
      <div class="public-shell-modern">
        <section class="public-hero-panel">
          <div class="public-hero-copy">
            <h1 data-dynamic-title>${escapeHtml(title)}</h1>
            <p class="lede">${escapeHtml(lede)}</p>
          </div>
          <div class="public-hero-gallery">
            <div class="public-slideshow-frame">
              <img class="public-slideshow-mark" src="/assets/logo/Genesys_Logo2.svg" alt="">
              <img id="publicHeroSlideshowImage" class="public-slideshow-image" src="${publicInBodySlides[0]}" alt="Wellness assessment gallery" data-slideshow="inbody">
              <div class="public-slideshow-overlay">
                <div class="public-slideshow-copy">
                  <span>${escapeHtml(isBooking ? 'Reserve your wellness scan' : 'Join the assessment raffle')}</span>
                  <strong>${escapeHtml(eventData.location)}</strong>
                  <em>${escapeHtml(eventDateTime)}</em>
                </div>
                <div id="publicHeroSlideshowDots" class="public-slideshow-dots" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="public-form-shell">
          <div class="form-card public-form-card">
            <div class="panel-head">
              <span class="section-kicker">Submission</span>
              <h2>${escapeHtml(isBooking ? 'Book your assessment' : 'Enter the raffle')}</h2>
            </div>
            <form id="publicInBodyForm" class="modern-form">
              ${renderInBodyFields(eventData)}
              <div class="form-submit-row">
                <button type="submit">${isBooking ? 'Book Assessment' : 'Submit Entry'}</button>
                <div id="publicFormStatus" class="status" aria-live="polite"></div>
              </div>
            </form>
            ${renderPoweredFooter('footer-note auth-legal public-form-powered')}
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderPublicCelaviveRafflePage(eventData) {
  const eventDateTime = eventData.displayDateTime || formatMetricDateTime(eventData.dateTime);
  const availability = eventData.celaviveRaffleAvailability || {};
  const entriesClosed = availability.canAccept === false;

  return `
    <div class="page public-page">
      <div class="public-shell-modern${entriesClosed ? ' is-rsvp-closed' : ''}">
        <section class="public-hero-panel">
          <div class="public-hero-copy">
            <h1 data-dynamic-title>CELAVIVE Personalized Skin Profile Form</h1>
            <p class="lede">Help us understand your skin better for a more personalized skincare experience.</p>
          </div>
          <div class="public-hero-gallery">
            <div class="public-slideshow-frame">
              <img class="public-slideshow-mark" src="/assets/logo/Genesys_Logo2.svg" alt="">
              <img id="publicHeroSlideshowImage" class="public-slideshow-image" src="${publicCelaviveSlides[0]}" alt="Celavive event gallery">
              <div class="public-slideshow-overlay">
                <div class="public-slideshow-copy">
                  <span>Complete your skin profile raffle entry</span>
                  <strong>${escapeHtml(eventData.location)}</strong>
                  <em>${escapeHtml(eventDateTime)}</em>
                </div>
                <div id="publicHeroSlideshowDots" class="public-slideshow-dots" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="public-form-shell">
          ${entriesClosed ? renderPublicCelaviveRaffleClosedCard(eventData, availability) : renderPublicCelaviveRaffleFormCard()}
        </section>
      </div>
    </div>
  `;
}

function renderPublicWellnessQuizPage(eventData) {
  const eventDateTime = eventData.displayDateTime || formatMetricDateTime(eventData.dateTime);

  return `
    <div class="page public-page">
      <div class="public-shell-modern">
        <section class="public-hero-panel">
          <div class="public-hero-copy">
            <h1 data-dynamic-title>${escapeHtml(eventData.wellnessQuizTitle)}</h1>
            <p class="lede">Complete this brief wellness check to help us understand your current health goals.</p>
          </div>
          <div class="public-hero-gallery">
            <div class="public-slideshow-frame">
              <img class="public-slideshow-mark" src="/assets/logo/Genesys_Logo2.svg" alt="">
              <img id="publicHeroSlideshowImage" class="public-slideshow-image" src="${publicInBodySlides[0]}" alt="Wellness check gallery" data-slideshow="inbody">
              <div class="public-slideshow-overlay">
                <div class="public-slideshow-copy">
                  <span>Take a moment for your wellness</span>
                  <strong>${escapeHtml(eventData.location)}</strong>
                  <em>${escapeHtml(eventDateTime)}</em>
                </div>
                <div id="publicHeroSlideshowDots" class="public-slideshow-dots" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </section>
        <section class="public-form-shell">
          <div class="form-card public-form-card">
            <div class="panel-head">
              <span class="section-kicker">Wellness Check</span>
              <h2>${escapeHtml(eventData.wellnessQuizTitle)}</h2>
            </div>
            <form id="publicWellnessQuizForm" class="modern-form celavive-raffle-form">
              ${renderWellnessQuizFields()}
              <div class="form-submit-row">
                <button type="submit">Submit Wellness Check</button>
                <div id="publicFormStatus" class="status" aria-live="polite"></div>
              </div>
            </form>
            ${renderPoweredFooter('footer-note auth-legal public-form-powered')}
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderWellnessQuizFields() {
  return `
    <div class="grid">
      <div class="field full">
        <label for="name">Name <span class="required">*</span></label>
        <input id="name" name="name" type="text" autocomplete="name" required>
      </div>
      <div class="field">
        <label for="age">Age <span class="required">*</span></label>
        <input id="age" name="age" type="number" inputmode="numeric" min="1" max="120" step="1" required>
      </div>
      <div class="field">
        <label for="mobileNumber">Mobile Number <span class="required">*</span></label>
        <input id="mobileNumber" name="mobileNumber" type="tel" inputmode="numeric" placeholder="09XXXXXXXXX" required>
      </div>
    </div>
    <div class="celavive-questionnaire">
      ${wellnessQuizQuestions.map((question, index) => renderCelaviveQuestion(question, index)).join('')}
    </div>
    <div class="field full">
      <label for="comments">Comments / Health Concerns <span class="optional">(Optional)</span></label>
      <textarea id="comments" name="comments" placeholder="Share any additional comments or health concerns"></textarea>
    </div>
  `;
}

function renderPublicCelaviveRaffleFormCard() {
  return `
    <div class="form-card public-form-card">
      <div class="panel-head">
        <span class="section-kicker">Raffle Entry</span>
        <h2>Personalized Skin Profile</h2>
      </div>
      <form id="publicCelaviveRaffleForm" class="modern-form celavive-raffle-form">
        ${renderCelaviveRaffleFields()}
        <div class="form-submit-row">
          <button type="submit">Submit Raffle Entry</button>
          <div id="publicFormStatus" class="status" aria-live="polite"></div>
        </div>
      </form>
      ${renderPoweredFooter('footer-note auth-legal public-form-powered')}
    </div>
  `;
}

function renderPublicCelaviveRaffleClosedCard(eventData, availability) {
  const isFull = availability && availability.reason === 'full';
  const titleHtml = isFull
    ? '<span class="public-closed-title-line">Raffle entries are</span><span class="public-closed-title-line">already full</span>'
    : '<span class="public-closed-title-line">Raffle entries are</span><span class="public-closed-title-line">paused right now</span>';

  return `
    <div class="form-card public-form-card public-closed-card">
      <div class="public-closed-mark" aria-hidden="true">
        <img src="/assets/logo/Genesys_Logo2.svg" alt="">
      </div>
      <span class="section-kicker">${isFull ? 'Entry list full' : 'Entries paused'}</span>
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

function renderCelaviveRaffleFields() {
  return `
    <div class="grid">
      <div class="field">
        <label for="name">Name <span class="optional">(Optional)</span></label>
        <input id="name" name="name" type="text" autocomplete="name">
      </div>
      <div class="field">
        <label for="contactNumber">Contact Number <span class="required">*</span></label>
        <input id="contactNumber" name="contactNumber" type="tel" inputmode="numeric" placeholder="09XXXXXXXXX" required>
      </div>
      <div class="field">
        <label for="emailAddress">Email Address <span class="required">*</span></label>
        <input id="emailAddress" name="emailAddress" type="email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="profession">Profession <span class="required">*</span></label>
        <select id="profession" name="profession" required>
          <option value="">Select profession</option>
          ${renderProfessionOptions()}
        </select>
      </div>
      <div class="field full">
        <label for="invitedBy">Name of the person who invited you <span class="required">*</span></label>
        <input id="invitedBy" name="invitedBy" type="text" required>
      </div>
    </div>
    <div class="celavive-questionnaire">
      ${celaviveRaffleQuestions.map((question, index) => renderCelaviveQuestion(question, index)).join('')}
    </div>
  `;
}

function renderCelaviveQuestion(question, index) {
  const type = question.type === 'checkbox' ? 'checkbox' : 'radio';
  const required = type === 'radio' ? ' required' : '';

  return `
    <fieldset class="celavive-question">
      <legend>${index + 1}. ${escapeHtml(question.label)} <span class="required">*</span></legend>
      <div class="celavive-choice-grid">
        ${question.options
          .map((option, optionIndex) => {
            const id = `${question.name}-${optionIndex}`;
            return `
              <label class="celavive-choice" for="${escapeAttribute(id)}">
                <input id="${escapeAttribute(id)}" name="${escapeAttribute(question.name)}" type="${type}" value="${escapeAttribute(option)}"${required}>
                <span>${escapeHtml(option)}</span>
              </label>
            `;
          })
          .join('')}
      </div>
    </fieldset>
  `;
}

function renderInBodyFields(eventData) {
  const isBooking = eventData.inBodyMode === 'booking';
  const slots = (eventData.inBodyAvailability && eventData.inBodyAvailability.slots) || [];
  const openSlots = slots.filter((slot) => !slot.isFull);

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
      ${
        isBooking
          ? `
            <div class="field full">
              <label for="slotId">Assessment Schedule <span class="required">*</span></label>
              <select id="slotId" name="slotId" required ${openSlots.length ? '' : 'disabled'}>
                <option value="">${openSlots.length ? 'Select schedule' : 'No schedules available'}</option>
                ${openSlots
                  .map((slot) => `<option value="${escapeAttribute(slot.slotId)}">${escapeHtml((slot.label || formatSlotLabel(slot)) + ` (${slot.remaining} left)`)}</option>`)
                  .join('')}
              </select>
            </div>
          `
          : ''
      }
    </div>
  `;
}

function renderPublicFormCard(isRsvp, eventData = {}) {
  return `
    <div class="form-card public-form-card">
      <div class="panel-head">
        <span class="section-kicker">Submission</span>
        <h2>${escapeHtml(isRsvp ? 'Confirm your attendance' : 'Register your attendance details')}</h2>
        <p>${escapeHtml(isRsvp ? 'Reply once so your host can prepare seating, refreshments, and follow-up reminders.' : 'We only ask for the details needed to verify entry and save your attendance in the event sheet.')}</p>
      </div>

      <form id="publicEventForm" class="modern-form">
        ${isRsvp ? renderRsvpFields(eventData) : renderAttendanceFields()}
        <div class="form-submit-row">
          <button type="submit">${isRsvp ? 'Confirm RSVP' : 'Save Attendance'}</button>
          <div id="publicFormStatus" class="status" aria-live="polite"></div>
        </div>
      </form>

      ${renderPoweredFooter('footer-note auth-legal public-form-powered')}
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

function renderRsvpFields(eventData = {}) {
  const isBeautyCaravan = isBeautyCaravanEvent(eventData);
  const beautyCaravanSlots = ((eventData.beautyCaravanAvailability && eventData.beautyCaravanAvailability.slots) || eventData.beautyCaravanSlots || []);

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
      ${
        isBeautyCaravan
          ? `
            <div class="field full">
              <label for="slotId">Preferred Time Slot <span class="required">*</span></label>
              <select id="slotId" name="slotId" required ${beautyCaravanSlots.length ? '' : 'disabled'}>
                <option value="">${beautyCaravanSlots.length ? 'Select time slot' : 'No time slots available'}</option>
                ${beautyCaravanSlots
                  .map((slot) => `<option value="${escapeAttribute(slot.slotId)}">${escapeHtml(slot.label || formatSlotLabel(slot))}</option>`)
                  .join('')}
              </select>
            </div>
          `
          : ''
      }
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
  const isInBody = isInBodyEvent(eventData);
  const isCelaviveRaffle = isCelaviveRaffleEvent(eventData);
  const isWellnessQuiz = isWellnessQuizEvent(eventData);

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
        ${
          isInBody
            ? ''
            : isCelaviveRaffle
              ? `
                <a href="${escapeAttribute(eventData.celaviveRafflePath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary">Open Raffle</a>
              `
            : isWellnessQuiz
              ? `<a href="${escapeAttribute(eventData.wellnessQuizPath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary">Open Wellness Quiz</a>`
            : `
              <a href="${escapeAttribute(eventData.rsvpPath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary">Open RSVP</a>
              <a href="${escapeAttribute(eventData.attendancePath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary">Open Attendance</a>
            `
        }
      </div>
    </article>
  `;
}

function renderTable(columns, rows, mode = '') {
  return `
    <div class="table-wrap">
      <table class="response-table">
        <thead>
          <tr>
            ${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  ${columns.map((column) => `<td>${renderResponseCell(row, column, mode)}</td>`).join('')}
                  <td>${renderResponseRowActions(row, mode)}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderResponseCell(row, column, mode = '') {
  const value = row[column] || '';

  if (mode === 'celavive-raffle' && column === 'Prospect Score' && value !== '') {
    return `
      <button
        type="button"
        class="prospect-score-button"
        data-prospect-score
        data-prospect-row="${escapeAttribute(JSON.stringify(row))}"
        aria-label="View score insight for ${escapeAttribute(row['Name'] || row['Email Address'] || 'this entry')}"
      >
        ${escapeHtml(value)}
      </button>
    `;
  }

  return escapeHtml(value);
}

function renderResponseRowActions(row, mode) {
  const rowNumber = row.__rowNumber || '';
  const responseName = row['Name'] || row['Full Name'] || row['Full Name of Attendee'] || row['Email Address'] || row['Mobile Number'] || 'this entry';

  if (!rowNumber) {
    return '';
  }

  return `
    <button
      type="button"
      class="button-link button-link-danger response-delete-button"
      data-delete-response-row
      data-row-number="${escapeAttribute(rowNumber)}"
      data-response-name="${escapeAttribute(responseName)}"
      data-response-mode="${escapeAttribute(mode)}"
    >
      Delete
    </button>
  `;
}

function buildCelaviveProspectInsight(row) {
  const score = Number.parseInt(String(row['Prospect Score'] || '0'), 10) || 0;
  const tier = row['Prospect Tier'] || getProspectTierFromScore(score);
  const concernCount = splitCelaviveConcernList(row['Top Skin Concerns']).length;
  const concernScore = Math.min(4, concernCount);
  const drivers = [
    `${concernCount} skin concern${concernCount === 1 ? '' : 's'} selected${concernCount ? `: ${row['Top Skin Concerns']}` : ''} (${concernScore} point${concernScore === 1 ? '' : 's'}).`,
    formatProspectDriver('Skincare importance', row['Skincare Importance'], getCelaviveOptionScore('skincareImportance', row['Skincare Importance'])),
    formatProspectDriver('Buying frequency', row['Buying Frequency'], getCelaviveOptionScore('buyingFrequency', row['Buying Frequency'])),
    formatProspectDriver('Current routine', row['Current Routine'], getCelaviveOptionScore('currentRoutine', row['Current Routine'])),
    formatProspectDriver('Monthly spend', row['Monthly Spend'], getCelaviveOptionScore('monthlySpend', row['Monthly Spend'])),
    formatProspectDriver('Premium experience', row['Premium Experience'], getCelaviveOptionScore('premiumExperience', row['Premium Experience'])),
    formatProspectDriver('Willingness to invest', row['Willingness To Invest'], getCelaviveOptionScore('willingnessToInvest', row['Willingness To Invest'])),
    formatProspectDriver('Personalized experience interest', row['Personalized Experience Interest'], getPersonalizedExperienceScore(row['Personalized Experience Interest']))
  ].filter(Boolean);

  return {
    title: `${score} · ${tier}`,
    summary: getProspectInsightSummary(score, tier, row, concernCount),
    drivers
  };
}

function getProspectInsightSummary(score, tier, row, concernCount) {
  const willingness = row['Willingness To Invest'] || 'no investment answer';
  const interest = row['Personalized Experience Interest'] || 'no personalized experience answer';
  const frequency = row['Buying Frequency'] || 'no buying frequency answer';

  if (score >= 18) {
    return `This guest is a ${tier} because they show strong skincare interest, selected ${concernCount} concern${concernCount === 1 ? '' : 's'}, buy skincare ${frequency.toLowerCase()}, and answered "${willingness}" about investing.`;
  }

  if (score >= 10) {
    return `This guest is a ${tier} because they show moderate interest: ${concernCount} concern${concernCount === 1 ? '' : 's'}, buying frequency of "${frequency}", and investment answer of "${willingness}".`;
  }

  return `This guest is a ${tier} because their answers show lighter current intent: ${concernCount} concern${concernCount === 1 ? '' : 's'}, "${frequency}" buying frequency, and "${interest}" for a personalized experience.`;
}

function formatProspectDriver(label, value, score) {
  if (!value) {
    return '';
  }

  return `${label}: ${value} (${score} point${score === 1 ? '' : 's'}).`;
}

function splitCelaviveConcernList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getProspectTierFromScore(score) {
  if (score >= 18) {
    return 'Hot Prospect';
  }

  if (score >= 10) {
    return 'Warm Prospect';
  }

  return 'Light Prospect';
}

function getCelaviveOptionScore(field, value) {
  const question = celaviveRaffleQuestions.find((item) => item.name === field);
  const index = question && question.options ? question.options.indexOf(value) : -1;

  return Math.max(0, index);
}

function getPersonalizedExperienceScore(value) {
  return {
    'Yes, definitely': 3,
    Maybe: 1,
    'Not right now': 0
  }[value] || 0;
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
                    <rect x="5" y="11" width="14" height="9" rx="2.5" stroke="currentColor" stroke-width="1.8"/>
                    <path d="M8 11V8.5C8 6.57 9.57 5 11.5 5H12.5C14.43 5 16 6.57 16 8.5V11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <path d="M12 14.2V16.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
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
  const formsPublished = events.reduce(
    (count, eventData) =>
      count +
      (eventData.rsvpPath && !isCelaviveRaffleEvent(eventData) && !isInBodyEvent(eventData) && !isWellnessQuizEvent(eventData) ? 1 : 0) +
      (eventData.attendancePath && !isCelaviveRaffleEvent(eventData) && !isInBodyEvent(eventData) && !isWellnessQuizEvent(eventData) ? 1 : 0) +
      (eventData.inBodyPath ? 1 : 0) +
      (eventData.celaviveRafflePath ? 1 : 0) +
      (eventData.wellnessQuizPath ? 1 : 0),
    0
  );

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

  const isInBody = isInBodyEvent(eventData);
  const isCelaviveRaffle = isCelaviveRaffleEvent(eventData);
  const isWellnessQuiz = isWellnessQuizEvent(eventData);

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
        ${
          isInBody
            ? `
              <a href="${escapeAttribute(eventData.inBodyPath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary">
                <span class="selected-event-action-icon">${renderEventActionIcon('external')}</span>
                <span>Open InBody</span>
              </a>
              <a href="/events/${encodeURIComponent(eventData.eventId)}/inbody-responses" data-link class="button-link button-link-secondary">
                <span class="selected-event-action-icon">${renderEventActionIcon('responses')}</span>
                <span>InBody Responses</span>
              </a>
            `
            : isCelaviveRaffle
              ? `
                <a href="${escapeAttribute(eventData.celaviveRafflePath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary">
                  <span class="selected-event-action-icon">${renderEventActionIcon('external')}</span>
                  <span>Open Raffle</span>
                </a>
                <a href="/events/${encodeURIComponent(eventData.eventId)}/celavive-raffle-responses" data-link class="button-link button-link-secondary">
                  <span class="selected-event-action-icon">${renderEventActionIcon('responses')}</span>
                  <span>Raffle Responses</span>
                </a>
              `
            : isWellnessQuiz
              ? `
                <a href="${escapeAttribute(eventData.wellnessQuizPath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary">
                  <span class="selected-event-action-icon">${renderEventActionIcon('external')}</span>
                  <span>Open Wellness Quiz</span>
                </a>
                <a href="/events/${encodeURIComponent(eventData.eventId)}/wellness-quiz-responses" data-link class="button-link button-link-secondary">
                  <span class="selected-event-action-icon">${renderEventActionIcon('responses')}</span>
                  <span>Quiz Responses</span>
                </a>
              `
            : `
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
            `
        }
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

function isInBodyEvent(eventData) {
  return INBODY_EVENT_TYPES.includes(String(eventData && eventData.eventType ? eventData.eventType : '').trim());
}

function isCelaviveRaffleEvent(eventData) {
  return String(eventData && eventData.eventType ? eventData.eventType : '').trim() === CELAVIVE_RAFFLE_EVENT_TYPE;
}

function isBeautyCaravanEvent(eventData) {
  return String(eventData && eventData.eventType ? eventData.eventType : '').trim() === BEAUTY_CARAVAN_EVENT_TYPE;
}

function isWellnessQuizEvent(eventData) {
  return String(eventData && eventData.eventType ? eventData.eventType : '').trim() === WELLNESS_QUIZ_EVENT_TYPE;
}

function getEventTypeDisplayLabel(type) {
  return isInBodyEvent({ eventType: type }) ? INBODY_EVENT_DISPLAY_LABEL : type;
}

function formatSlotLabel(slot) {
  const endDate = slot.endDate || slot.date;
  const dateLabel = endDate && endDate !== slot.date
    ? `${formatPlainDate(slot.date)} - ${formatPlainDate(endDate)}`
    : formatPlainDate(slot.date);
  const startLabel = formatPlainTime(slot.startTime);
  const endLabel = formatPlainTime(slot.endTime);

  return `${dateLabel}, ${startLabel} - ${endLabel}`;
}

function formatPlainDate(value) {
  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value || 'Schedule';
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(parsedDate);
}

function formatPlainTime(value) {
  const parsedDate = new Date(`2000-01-01T${value}`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value || '';
  }

  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsedDate);
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

function inBodyColumnFallback() {
  return [
    'Full Name',
    'Email Address',
    'Mobile Number',
    'Profession',
    'Invited By',
    'InBody Mode',
    'Slot Label',
    'Booking Status',
    'Updated At'
  ];
}

function celaviveRaffleColumnFallback() {
  return [
    'Name',
    'Contact Number',
    'Email Address',
    'Profession',
    'Invited By',
    'Prospect Score',
    'Prospect Tier'
  ];
}

function wellnessQuizColumnFallback() {
  return [
    'Name',
    'Age',
    'Mobile Number',
    'Current Concerns',
    'Health Rating',
    '90-Day Health Goal',
    'Consultation Interest',
    'Comments / Health Concerns'
  ];
}

function getResponseModeLabel(mode) {
  if (mode === 'rsvp') {
    return 'RSVP';
  }

  if (mode === 'attendance') {
    return 'attendance';
  }

  if (mode === 'inbody') {
    return 'InBody';
  }

  if (mode === 'celavive-raffle') {
    return 'Celavive raffle';
  }

  if (mode === 'wellness-quiz') {
    return 'Wellness Quiz';
  }

  return 'event';
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
