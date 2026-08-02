const app = document.getElementById('app');
const INBODY_EVENT_TYPE = 'Wellness Assessment';
const LEGACY_INBODY_EVENT_TYPE = 'Free InBody Assessment';
const INBODY_EVENT_DISPLAY_LABEL = 'Free Wellness Assessment';
const INBODY_EVENT_TYPES = [INBODY_EVENT_TYPE, LEGACY_INBODY_EVENT_TYPE];
const CELAVIVE_RAFFLE_EVENT_TYPE = 'Celavive Spa Party - Raffle Entry';
const BEAUTY_CARAVAN_EVENT_TYPE = 'Beauty Caravan';
const WELLNESS_QUIZ_EVENT_TYPE = 'Wellness Quiz';
const GROUP_DELIVERY_EVENT_TYPE = 'Group Delivery';
const CELAVIVE_SPA_PARTY_EVENT_TYPE = 'Celavive Spa Party';
const WELLNESS_WEDNESDAY_EVENT_TYPE = 'Wellness Wednesday';
// Standard RSVP + attendance events: same public pages and "view" responses link
const STANDARD_RSVP_EVENT_TYPES = [CELAVIVE_SPA_PARTY_EVENT_TYPE, WELLNESS_WEDNESDAY_EVENT_TYPE];
const DEFAULT_WELLNESS_RAFFLE_WIN_CHANCE = 65;
const GROUP_DELIVERY_SESSION_KEY = 'groupDeliverySession';
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

function getWellnessRaffleWinChance(raffle = {}) {
  const value = Number(raffle.winChance);
  if (!Number.isFinite(value) || value < 1 || value > 99) return DEFAULT_WELLNESS_RAFFLE_WIN_CHANCE;
  return value;
}

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
      eventName: CELAVIVE_SPA_PARTY_EVENT_TYPE,
      eventTypes: ['OPP', CELAVIVE_SPA_PARTY_EVENT_TYPE, WELLNESS_WEDNESDAY_EVENT_TYPE, BEAUTY_CARAVAN_EVENT_TYPE, CELAVIVE_RAFFLE_EVENT_TYPE, INBODY_EVENT_TYPE, WELLNESS_QUIZ_EVENT_TYPE],
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

  if (pathname === '/qr-generator') {
    if (!(await guardAuthenticated())) {
      return;
    }

    renderPage(renderQrGeneratorPage());
    attachAdminShellHandlers();
    attachQrGeneratorHandlers();
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
      const groupDeliveryUsersResult = isGroupDeliveryEvent(eventResult.event)
        ? await fetchJson(`/events/${eventId}/group-delivery-users`)
        : { users: [] };
      const groupDeliveryCyclesResult = isGroupDeliveryEvent(eventResult.event)
        ? await fetchJson(`/events/${eventId}/group-delivery-cycles`)
        : { cycles: [], currentCycle: null };
      renderPage(renderEventDetailPage(eventResult.event, {
        rsvpResponses: rsvpResult.responses || [],
        attendanceResponses: attendanceResult.responses || [],
        inBodyResponses: inBodyResult.responses || [],
        celaviveRaffleResponses: celaviveRaffleResult.responses || [],
        wellnessQuizResponses: wellnessQuizResult.responses || [],
        groupDeliveryUsers: groupDeliveryUsersResult.users || [],
        groupDeliveryCycles: groupDeliveryCyclesResult.cycles || [],
        groupDeliveryCurrentCycle: groupDeliveryCyclesResult.currentCycle || null
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
      const identifier = rsvpMatch[1];
      const isView = identifier.endsWith('view');
      const result = await fetchJson(`/public-events/${identifier}`);

      if (isView && isStandardRsvpEvent(result.event)) {
        const responsesResult = await fetchJson(`/public-events/${identifier}/rsvp-responses`);
        renderPage(renderResponsesPage('RSVP Responses', responsesResult.event, responsesResult.responses, 'rsvp'));
        attachPublicShowcase();
        syncDynamicHeaderTitle();
      } else {
        renderPage(renderPublicEventPage('rsvp', result.event));
        attachPublicShowcase();
        syncDynamicHeaderTitle();
        attachRsvpHandlers(result.event);
      }
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

  const groupDeliveryMatch = pathname.match(/^\/group-delivery\/([^/]+)$/);

  if (groupDeliveryMatch) {
    renderLoading('Loading group delivery form...');

    try {
      const result = await fetchJson(`/public-group-delivery/${groupDeliveryMatch[1]}`);

      if (!isGroupDeliveryEvent(result.event)) {
        renderPage(renderErrorPage('Group Delivery page unavailable.', 'This event does not have a Group Delivery workflow.'));
        return;
      }

      renderPage(renderPublicGroupDeliveryPage(result.event, result.currentCycle));
      attachPublicShowcase();
      syncDynamicHeaderTitle();
      attachGroupDeliveryHandlers(result.event);
    } catch (error) {
      renderPage(renderErrorPage('Unable to load that Group Delivery page.', error.message));
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
      wellnessQuizTitleInput.disabled = !isWellnessQuiz;

      if (!isWellnessQuiz) {
        wellnessQuizTitleInput.value = '';
      }
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

function attachQrGeneratorHandlers() {
  const form = document.getElementById('qrGeneratorForm');
  const titleInput = document.getElementById('qrGeneratorTitle');
  const contentInput = document.getElementById('qrGeneratorContent');
  const previewImage = document.getElementById('qrGeneratorPreviewImage');
  const rawOpenLink = document.getElementById('qrGeneratorRawOpenLink');
  const brandedOpenButton = document.getElementById('qrGeneratorBrandedOpenButton');
  const brandedDownloadButton = document.getElementById('qrGeneratorBrandedDownloadButton');
  const rawDownloadLink = document.getElementById('qrGeneratorRawDownloadLink');
  const copyButton = document.getElementById('qrGeneratorCopyButton');
  const status = document.getElementById('qrGeneratorStatus');

  if (!form || !contentInput || !previewImage) {
    return;
  }

  const syncPreview = () => {
    const content = contentInput.value.trim();
    const title = titleInput && titleInput.value.trim() ? titleInput.value.trim() : 'GeneSys QR';
    const qrUrl = content ? buildQrUrl(content) : '';

    previewImage.src = qrUrl || buildQrUrl(window.location.origin);
    previewImage.alt = content ? `QR code for ${title}` : 'QR code preview';

    if (rawOpenLink) {
      rawOpenLink.href = qrUrl || buildQrUrl(window.location.origin);
      rawOpenLink.toggleAttribute('aria-disabled', !content);
    }

    if (rawDownloadLink) {
      rawDownloadLink.href = qrUrl || buildQrUrl(window.location.origin);
      rawDownloadLink.download = `${slugifyTitle(title)}-qr.png`;
      rawDownloadLink.toggleAttribute('aria-disabled', !content);
    }

    if (brandedOpenButton) {
      brandedOpenButton.disabled = !content;
    }

    if (brandedDownloadButton) {
      brandedDownloadButton.disabled = !content;
    }

    if (copyButton) {
      copyButton.disabled = !content;
    }
  };

  contentInput.addEventListener('input', syncPreview);
  titleInput?.addEventListener('input', syncPreview);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const content = contentInput.value.trim();
    const title = titleInput && titleInput.value.trim() ? titleInput.value.trim() : 'GeneSys QR';

    if (!content) {
      setStatus(status, 'Add a link or text to generate a QR code.', 'is-error');
      return;
    }

    setStatus(status, 'QR code updated.', 'is-success');
    previewImage.src = buildQrUrl(content);
    previewImage.alt = `QR code for ${title}`;
  });

  brandedOpenButton?.addEventListener('click', () => {
    const content = contentInput.value.trim();
    const title = titleInput && titleInput.value.trim() ? titleInput.value.trim() : 'GeneSys QR';

    if (!content) {
      setStatus(status, 'Add a link or text to generate a QR code.', 'is-error');
      return;
    }

    openBrandedQrTab({ eventLabel: title }, content);
  });

  brandedDownloadButton?.addEventListener('click', () => {
    const content = contentInput.value.trim();
    const title = titleInput && titleInput.value.trim() ? titleInput.value.trim() : 'GeneSys QR';

    if (!content) {
      setStatus(status, 'Add a link or text to generate a QR code.', 'is-error');
      return;
    }

    downloadTextFile(
      `${slugifyTitle(title)}-branded-qr.svg`,
      buildBrandedQrSvg(title, buildQrUrl(content), content),
      'image/svg+xml;charset=utf-8'
    );
    setStatus(status, 'Branded QR downloaded.', 'is-success');
  });

  copyButton?.addEventListener('click', async () => {
    const content = contentInput.value.trim();

    if (!content) {
      setStatus(status, 'Add a link or text to copy.', 'is-error');
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setStatus(status, 'Copied.', 'is-success');
    } catch (error) {
      setStatus(status, 'Unable to copy from this browser.', 'is-error');
    }
  });

  syncPreview();
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
  const groupDeliveryQrImage = document.getElementById('groupDeliveryQrImage');
  const groupDeliveryQrOpenLink = document.getElementById('groupDeliveryQrOpenLink');
  const rsvpUrl = `${window.location.origin}${eventData.rsvpPath}`;
  const inBodyUrl = eventData.inBodyPath ? `${window.location.origin}${eventData.inBodyPath}` : '';
  const celaviveRaffleUrl = eventData.celaviveRafflePath ? `${window.location.origin}${eventData.celaviveRafflePath}` : '';
  const wellnessQuizUrl = eventData.wellnessQuizPath ? `${window.location.origin}${eventData.wellnessQuizPath}` : '';
  const groupDeliveryUrl = eventData.groupDeliveryPath ? `${window.location.origin}${eventData.groupDeliveryPath}` : '';

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

  if (groupDeliveryQrImage && groupDeliveryUrl) {
    groupDeliveryQrImage.src = buildQrUrl(groupDeliveryUrl);
    groupDeliveryQrImage.alt = `Branded QR code for ${eventData.eventLabel} Group Delivery`;
  }

  if (groupDeliveryQrOpenLink && groupDeliveryUrl) {
    groupDeliveryQrOpenLink.href = buildQrUrl(groupDeliveryUrl);
    groupDeliveryQrOpenLink.addEventListener('click', (event) => {
      event.preventDefault();
      openBrandedQrTab({ ...eventData, eventLabel: `${eventData.eventLabel} Group Delivery` }, groupDeliveryUrl);
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
  const wellnessRaffleForm = document.getElementById('wellnessRaffleSettingsForm');
  const wellnessPrizeList = document.getElementById('wellnessPrizeList');
  const addWellnessPrizeButton = document.getElementById('addWellnessPrizeButton');
  const distributeWellnessPrizesButton = document.getElementById('distributeWellnessPrizesButton');
  const submitGroupDeliveryCycleButton = document.getElementById('submitGroupDeliveryCycleButton');
  const resetGroupDeliveryButtons = Array.from(document.querySelectorAll('[data-reset-group-delivery-pin]'));
  const closeRsvpSettingsButtons = Array.from(document.querySelectorAll('[data-close-rsvp-settings]'));
  const managementStatus = document.getElementById('eventManagementStatus');
  const groupDeliveryAdminStatus = document.getElementById('groupDeliveryAdminStatus');

  const readWellnessRaffleDraft = () => {
    if (!wellnessRaffleForm || !wellnessPrizeList) return null;
    const rawPrizes = [...wellnessPrizeList.querySelectorAll('[data-wellness-prize]')].map((row) => ({
      id: row.dataset.prizeId || '',
      label: row.querySelector('[data-prize-label]')?.value.trim() || 'Prize',
      color: row.querySelector('[data-prize-color]')?.value || '#e05a9d',
      chance: Math.max(0, Number(row.querySelector('[data-prize-chance]')?.value) || 0),
      visualSliceCount: Math.max(1, Number(row.querySelector('[data-prize-visual-slices]')?.value) || 1)
    }));
    const totalShare = rawPrizes.reduce((sum, prize) => sum + prize.chance, 0);
    return {
      enabled: document.getElementById('wellnessRaffleEnabled')?.checked || false,
      title: document.getElementById('wellnessRaffleTitle')?.value.trim() || 'Spin to Win',
      winChance: Math.max(1, Math.min(99, Number(document.getElementById('wellnessRaffleWinChance')?.value) || DEFAULT_WELLNESS_RAFFLE_WIN_CHANCE)),
      losingLabel: document.getElementById('wellnessRaffleLosingLabel')?.value.trim() || 'Better luck next time',
      losingColor: document.getElementById('wellnessRaffleLosingColor')?.value || '#7457d9',
      losingSliceCount: Math.max(0, Number(document.getElementById('wellnessRaffleLosingSliceCount')?.value) || 0),
      losingVisualChance: Math.max(1, Number(document.getElementById('wellnessRaffleLosingVisualChance')?.value) || (100 - DEFAULT_WELLNESS_RAFFLE_WIN_CHANCE)),
      soldOut: false,
      prizes: rawPrizes
        .filter((prize) => prize.chance > 0)
        .map((prize) => ({
          ...prize,
          available: true,
          effectiveChance: totalShare > 0 ? (prize.chance / totalShare) * getWellnessRaffleWinChance({
            winChance: Number(document.getElementById('wellnessRaffleWinChance')?.value) || DEFAULT_WELLNESS_RAFFLE_WIN_CHANCE
          }) : 0
        }))
    };
  };

  const updateWellnessRafflePreview = () => {
    const preview = document.getElementById('wellnessRafflePreview');
    if (!preview) return;
    const draft = readWellnessRaffleDraft();
    if (!draft || !draft.prizes.length) {
      preview.innerHTML = '<p class="empty-state">Add at least one prize with a winning-pool share to preview the wheel.</p>';
      return;
    }
    preview.innerHTML = renderWellnessWheel(draft, { preview: true });
  };

  const updateWellnessRaffleVisualLimit = () => {
    const winChanceInput = document.getElementById('wellnessRaffleWinChance');
    const losingVisualInput = document.getElementById('wellnessRaffleLosingVisualChance');
    const losingVisualHint = document.getElementById('wellnessRaffleLosingVisualHint');
    if (!winChanceInput || !losingVisualInput) return;
    const max = Math.max(1, 100 - (Number(winChanceInput.value) || DEFAULT_WELLNESS_RAFFLE_WIN_CHANCE));
    losingVisualInput.max = String(max);
    if (Number(losingVisualInput.value) > max) {
      losingVisualInput.value = String(max);
    }
    if (losingVisualHint) {
      losingVisualHint.textContent = `Visual only. Real winning chance stays ${Number(winChanceInput.value) || DEFAULT_WELLNESS_RAFFLE_WIN_CHANCE}%.`;
    }
  };

  const updateWellnessChanceTotal = () => {
    const totalElement = document.getElementById('wellnessPrizeChanceTotal');
    if (!totalElement || !wellnessPrizeList) return;
    const total = [...wellnessPrizeList.querySelectorAll('[data-prize-chance]')]
      .reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    totalElement.textContent = `${Math.round(total * 100) / 100}% of 100% winning pool`;
    totalElement.classList.toggle('is-valid', Math.abs(total - 100) < 0.001);
    updateWellnessRafflePreview();
  };

  if (wellnessPrizeList) {
    wellnessPrizeList.addEventListener('input', updateWellnessChanceTotal);
    wellnessPrizeList.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-wellness-prize]');
      if (!removeButton || removeButton.disabled) return;
      const row = removeButton.closest('[data-wellness-prize]');
      if (row) row.remove();
      updateWellnessChanceTotal();
    });
    updateWellnessChanceTotal();
  }

  if (addWellnessPrizeButton && wellnessPrizeList) {
    addWellnessPrizeButton.addEventListener('click', () => {
      wellnessPrizeList.insertAdjacentHTML('beforeend', renderWellnessPrizeEditorRow({
        id: `prize_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        color: '#4f7de8', quantity: 1, chance: ''
      }));
      updateWellnessChanceTotal();
      const rows = wellnessPrizeList.querySelectorAll('[data-wellness-prize]');
      rows[rows.length - 1]?.querySelector('[data-prize-label]')?.focus();
    });
  }

  if (distributeWellnessPrizesButton && wellnessPrizeList) {
    distributeWellnessPrizesButton.addEventListener('click', () => {
      const inputs = [...wellnessPrizeList.querySelectorAll('[data-prize-chance]')];
      if (!inputs.length) return;
      const baseHundredths = Math.floor(10000 / inputs.length);
      let remainingHundredths = 10000 - (baseHundredths * inputs.length);
      inputs.forEach((input) => {
        const hundredths = baseHundredths + (remainingHundredths > 0 ? 1 : 0);
        remainingHundredths = Math.max(0, remainingHundredths - 1);
        input.value = (hundredths / 100).toFixed(2).replace(/\.00$/, '');
      });
      updateWellnessChanceTotal();
    });
  }

  if (wellnessRaffleForm) {
    wellnessRaffleForm.addEventListener('input', () => {
      updateWellnessRaffleVisualLimit();
      updateWellnessRafflePreview();
    });
    updateWellnessRaffleVisualLimit();
    updateWellnessRafflePreview();
  }

  if (wellnessRaffleForm && wellnessPrizeList) {
    wellnessRaffleForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = wellnessRaffleForm.querySelector('button[type="submit"]');
      const status = document.getElementById('wellnessRaffleSettingsStatus');
      const prizes = [...wellnessPrizeList.querySelectorAll('[data-wellness-prize]')].map((row) => ({
        id: row.dataset.prizeId || `prize_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        label: row.querySelector('[data-prize-label]').value,
        color: row.querySelector('[data-prize-color]').value,
        quantity: Number(row.querySelector('[data-prize-quantity]').value),
        chance: Number(row.querySelector('[data-prize-chance]').value),
        visualSliceCount: Number(row.querySelector('[data-prize-visual-slices]').value) || 1
      }));
      setStatus(status, '', '');
      try {
        setButtonLoading(submitButton, true, 'Saving...');
        const result = await fetchJson(`/events/${eventData.eventId}`, {
          method: 'PATCH',
          body: {
            action: 'wellness-raffle-settings',
            wellnessRaffleConfig: {
              enabled: document.getElementById('wellnessRaffleEnabled').checked,
              title: document.getElementById('wellnessRaffleTitle').value,
              winChance: Number(document.getElementById('wellnessRaffleWinChance').value) || DEFAULT_WELLNESS_RAFFLE_WIN_CHANCE,
              losingLabel: document.getElementById('wellnessRaffleLosingLabel').value,
              losingColor: document.getElementById('wellnessRaffleLosingColor').value,
              losingSliceCount: Number(document.getElementById('wellnessRaffleLosingSliceCount').value) || 0,
              losingVisualChance: Number(document.getElementById('wellnessRaffleLosingVisualChance').value) || (100 - DEFAULT_WELLNESS_RAFFLE_WIN_CHANCE),
              prizes
            }
          }
        });
        setStatus(status, result.message, 'is-success');
        window.setTimeout(() => navigate(`/events/${encodeURIComponent(eventData.eventId)}`, true), 450);
      } catch (error) {
        setStatus(status, error.message, 'is-error');
      } finally {
        setButtonLoading(submitButton, false, 'Save Wheel');
      }
    });
  }

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
      const dateTime = scheduleForm.elements.dateTime.value;
      const location = scheduleForm.elements.location.value;

      setStatus(managementStatus, '', '');

      try {
        setButtonLoading(submitButton, true, 'Saving...');
        const result = await fetchJson(`/events/${eventData.eventId}`, {
          method: 'PATCH',
          body: {
            action: 'reschedule',
            location,
            dateTime
          }
        });

        setStatus(managementStatus, result.message, 'is-success');
        navigate(`/events/${encodeURIComponent(result.event.eventId)}`, true);
      } catch (error) {
        setStatus(managementStatus, error.message, 'is-error');
      } finally {
        setButtonLoading(submitButton, false, 'Update');
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

  if (submitGroupDeliveryCycleButton) {
    submitGroupDeliveryCycleButton.addEventListener('click', async () => {
      const confirmed = await showConfirmModal({
        title: 'Submit current cycle?',
        message: 'This locks the current cycle and opens the next blank cycle on the same public link.',
        confirmLabel: 'Submit Cycle'
      });

      if (!confirmed) return;

      setStatus(groupDeliveryAdminStatus, '', '');

      try {
        setButtonLoading(submitGroupDeliveryCycleButton, true, 'Submitting...');
        const result = await fetchJson(`/events/${eventData.eventId}/group-delivery-cycles/current/submit`, {
          method: 'PATCH'
        });
        setStatus(groupDeliveryAdminStatus, result.message, 'is-success');
        navigate(`/events/${encodeURIComponent(eventData.eventId)}`, true);
      } catch (error) {
        setStatus(groupDeliveryAdminStatus, error.message, 'is-error');
      } finally {
        setButtonLoading(submitGroupDeliveryCycleButton, false, 'Mark Current Cycle Submitted');
      }
    });
  }

  resetGroupDeliveryButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const co = button.getAttribute('data-co') || '';
      const confirmed = await showConfirmModal({
        title: 'Reset this PIN?',
        message: `Clear the PIN for ${co} so they can create a new one from the public link?`,
        confirmLabel: 'Reset PIN'
      });

      if (!confirmed) return;

      setStatus(groupDeliveryAdminStatus, '', '');

      try {
        setButtonLoading(button, true, 'Resetting...');
        const result = await fetchJson(`/events/${eventData.eventId}/group-delivery-users/${encodeURIComponent(co)}/reset-pin`, {
          method: 'PATCH'
        });
        setStatus(groupDeliveryAdminStatus, result.message, 'is-success');
        navigate(`/events/${encodeURIComponent(eventData.eventId)}`, true);
      } catch (error) {
        setStatus(groupDeliveryAdminStatus, error.message, 'is-error');
      } finally {
        setButtonLoading(button, false, 'Reset PIN');
      }
    });
  });

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

function attachGroupDeliveryHandlers(eventData) {
  const coForm = document.getElementById('groupDeliveryCoForm');
  const pinForm = document.getElementById('groupDeliveryPinForm');
  const entryForm = document.getElementById('groupDeliveryEntryForm');
  const forgotButton = document.getElementById('groupDeliveryForgotPinButton');
  const logoutButton = document.getElementById('groupDeliveryLogoutButton');
  const session = getGroupDeliverySession();

  if (session) {
    void loadGroupDeliveryRecords(eventData);
  }

  if (coForm) {
    coForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = document.getElementById('groupDeliveryAuthStatus');
      const submitButton = coForm.querySelector('button[type="submit"]');
      const co = coForm.co.value;

      setStatus(status, '', '');

      try {
        setButtonLoading(submitButton, true, 'Checking...');
        const result = await fetchJson('/group-delivery/auth/start', {
          method: 'POST',
          body: { co }
        });
        showGroupDeliveryPinStage(result.co, result.mode, result.message || '');
      } catch (error) {
        setStatus(status, error.message, 'is-error');
      } finally {
        setButtonLoading(submitButton, false, 'Continue');
      }
    });
  }

  if (pinForm) {
    pinForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const mode = pinForm.dataset.mode || 'login';
      const status = document.getElementById('groupDeliveryAuthStatus');
      const submitButton = pinForm.querySelector('button[type="submit"]');
      const body = {
        co: pinForm.co.value,
        pin: pinForm.pin.value
      };

      if (mode === 'register') {
        body.confirmPin = pinForm.confirmPin.value;
      }

      setStatus(status, '', '');

      try {
        setButtonLoading(submitButton, true, mode === 'register' ? 'Creating PIN...' : 'Logging in...');
        const result = await fetchJson(mode === 'register' ? '/group-delivery/auth/register' : '/group-delivery/auth/login', {
          method: 'POST',
          body
        });
        setGroupDeliverySession(result.token);
        setStatus(status, '', '');
        await loadGroupDeliveryRecords(eventData);
      } catch (error) {
        setStatus(status, error.message, 'is-error');
      } finally {
        setButtonLoading(submitButton, false, mode === 'register' ? 'Create PIN' : 'Log In');
      }
    });
  }

  if (forgotButton) {
    forgotButton.addEventListener('click', async () => {
      const co = document.getElementById('groupDeliveryPinCo')?.value || document.getElementById('groupDeliveryCo')?.value || '';
      const status = document.getElementById('groupDeliveryAuthStatus');
      setStatus(status, '', '');

      try {
        setButtonLoading(forgotButton, true, 'Requesting...');
        const result = await fetchJson('/group-delivery/auth/forgot-pin', {
          method: 'POST',
          body: { co }
        });
        clearGroupDeliverySession();
        setStatus(status, result.message, 'is-success');
      } catch (error) {
        setStatus(status, error.message, 'is-error');
      } finally {
        setButtonLoading(forgotButton, false, 'Forgot PIN');
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      clearGroupDeliverySession();
      renderPage(renderPublicGroupDeliveryPage(eventData));
      attachPublicShowcase();
      syncDynamicHeaderTitle();
      attachGroupDeliveryHandlers(eventData);
    });
  }

  if (entryForm) {
    entryForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = document.getElementById('groupDeliveryEntryStatus');
      const submitButton = entryForm.querySelector('button[type="submit"]');

      setStatus(status, '', '');

      try {
        setButtonLoading(submitButton, true, 'Saving...');
        const result = await groupDeliveryFetchJson(`/group-delivery/${eventData.eventId}/my-records`, {
          method: 'POST',
          body: {
            co: entryForm.co.value,
            fullName: entryForm.fullName.value,
            birthday: entryForm.birthday.value,
            mobileNumber: entryForm.mobileNumber.value,
            emailAddress: entryForm.emailAddress.value,
            address: entryForm.address.value,
            profession: entryForm.profession.value
          }
        });
        renderGroupDeliveryWorkspace(eventData, result);
        setStatus(document.getElementById('groupDeliveryEntryStatus'), result.message, 'is-success');
        attachGroupDeliveryHandlers(eventData);
      } catch (error) {
        if (/session|log in/i.test(error.message)) {
          clearGroupDeliverySession();
        }
        setStatus(status, error.message, 'is-error');
      } finally {
        setButtonLoading(submitButton, false, 'Save Entry');
      }
    });
  }
}

async function loadGroupDeliveryRecords(eventData) {
  const status = document.getElementById('groupDeliveryAuthStatus');

  try {
    const result = await groupDeliveryFetchJson(`/group-delivery/${eventData.eventId}/my-records`);
    renderGroupDeliveryWorkspace(eventData, result);
    attachGroupDeliveryHandlers(eventData);
  } catch (error) {
    clearGroupDeliverySession();
    setStatus(status, error.message, 'is-error');
  }
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

  let storedSpinToken = '';
  try {
    storedSpinToken = window.localStorage.getItem(getWellnessSpinStorageKey(eventData.eventId)) || '';
  } catch (error) {
    storedSpinToken = '';
  }

  if (storedSpinToken && eventData.wellnessRaffle && eventData.wellnessRaffle.enabled) {
    showWellnessWheel(eventData, storedSpinToken);
    return;
  }

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
      if (result.spinToken && result.wellnessRaffle && result.wellnessRaffle.enabled) {
        eventData.wellnessRaffle = result.wellnessRaffle;
        try {
          window.localStorage.setItem(getWellnessSpinStorageKey(eventData.eventId), result.spinToken);
        } catch (error) {
          // The current page can still complete the spin when storage is unavailable.
        }
        showWellnessWheel(eventData, result.spinToken);
      } else {
        setStatus(status, result.message, 'is-success');
      }
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
  document.querySelectorAll('[data-reset-wellness-spin]').forEach((button) => {
    button.addEventListener('click', async () => {
      const rowNumber = button.getAttribute('data-row-number');
      const responseName = button.getAttribute('data-response-name') || 'this attendee';
      const confirmed = await showConfirmModal({
        title: 'Grant another spin?',
        message: `${responseName} will receive one additional spin. Previous prizes remain recorded.`,
        confirmLabel: 'Grant Spin'
      });
      if (!confirmed) return;
      try {
        setButtonLoading(button, true, 'Granting...');
        const result = await fetchJson(`/events/${eventData.eventId}/wellness-quiz-responses/${rowNumber}/reset-spin`, { method: 'PATCH' });
        setStatus(document.getElementById('responseActionStatus'), result.message, 'is-success');
        window.setTimeout(() => navigate(window.location.pathname, true), 450);
      } catch (error) {
        setStatus(document.getElementById('responseActionStatus'), error.message, 'is-error');
      } finally {
        setButtonLoading(button, false, 'Grant Spin');
      }
    });
  });

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

function renderQrGeneratorPage() {
  const defaultContent = window.location.origin;

  return renderAdminFrame({
    activeView: 'qr-generator',
    user: state.session,
    eventCount: state.cachedEventCount,
    title: 'QR Generator',
    subtitle: 'Create a branded QR code for any event link, registration page, or custom text.',
    badge: 'QR tool',
    headerControls: renderHeaderBackLink('/dashboard', 'Back to dashboard'),
    content: `
      <section class="qr-generator-layout">
        <section class="workspace-panel workspace-panel-large qr-generator-panel">
          <div class="workspace-heading">
            <div>
              <span class="section-kicker">QR setup</span>
              <h2>Generate QR</h2>
            </div>
          </div>

          <form id="qrGeneratorForm" class="stack-form modern-form qr-generator-form">
            <div class="field">
              <label for="qrGeneratorTitle">QR Title</label>
              <input id="qrGeneratorTitle" name="qrGeneratorTitle" type="text" value="GeneSys QR">
            </div>
            <div class="field">
              <label for="qrGeneratorContent">Link or Text <span class="required">*</span></label>
              <textarea id="qrGeneratorContent" name="qrGeneratorContent" rows="5" required placeholder="https://example.com">${escapeHtml(defaultContent)}</textarea>
            </div>
            <div class="qr-generator-actions">
              <button type="submit" class="topbar-primary">Generate QR</button>
              <button id="qrGeneratorCopyButton" type="button" class="button-link button-link-secondary">Copy Text</button>
            </div>
            <p id="qrGeneratorStatus" class="form-status" role="status" aria-live="polite"></p>
          </form>
        </section>

        <aside class="workspace-panel qr-card qr-generator-preview-card">
          <span class="section-kicker">Preview</span>
          <h3>Branded QR</h3>
          <div class="qr-panel">
            <div class="qr-image-stack">
              <img id="qrGeneratorPreviewImage" class="qr-image" src="${escapeAttribute(buildQrUrl(defaultContent))}" alt="QR code preview">
              <img class="qr-brand-mark" src="/assets/logo/Genesys_Logo2.svg" alt="" aria-hidden="true">
            </div>
          </div>
          <div class="qr-generator-preview-actions">
            <div class="qr-generator-primary-actions">
              <button id="qrGeneratorBrandedOpenButton" type="button" class="button-link">Open Branded QR</button>
              <button
                id="qrGeneratorBrandedDownloadButton"
                type="button"
                class="button-link button-link-secondary qr-generator-download-icon"
                aria-label="Download branded QR SVG"
                title="Download branded QR SVG"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3v11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                  <path d="m7 10 5 5 5-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M5 19h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="qr-generator-primary-actions">
              <a id="qrGeneratorRawOpenLink" class="button-link button-link-secondary" target="_blank" rel="noreferrer" href="${escapeAttribute(buildQrUrl(defaultContent))}">Open Raw QR</a>
              <a
                id="qrGeneratorRawDownloadLink"
                class="button-link button-link-secondary qr-generator-download-icon"
                href="${escapeAttribute(buildQrUrl(defaultContent))}"
                download="genesys-qr.png"
                aria-label="Download raw QR PNG"
                title="Download raw QR PNG"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3v11" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                  <path d="m7 10 5 5 5-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M5 19h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
              </a>
            </div>
          </div>
        </aside>
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
            <div id="wellnessQuizEventSetup" class="field full wellness-quiz-event-setup" hidden>
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
  const isGroupDelivery = isGroupDeliveryEvent(eventData);
  const rsvpUrl = `${window.location.origin}${eventData.rsvpPath}`;
  const attendanceUrl = `${window.location.origin}${eventData.attendancePath}`;
  const inBodyUrl = eventData.inBodyPath ? `${window.location.origin}${eventData.inBodyPath}` : '';
  const celaviveRaffleUrl = eventData.celaviveRafflePath ? `${window.location.origin}${eventData.celaviveRafflePath}` : '';
  const wellnessQuizUrl = eventData.wellnessQuizPath ? `${window.location.origin}${eventData.wellnessQuizPath}` : '';
  const groupDeliveryUrl = eventData.groupDeliveryPath ? `${window.location.origin}${eventData.groupDeliveryPath}` : '';
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
      <section class="editor-grid event-detail-layout${eventData.isArchived ? ' is-archived' : ' is-active'}${isWellnessQuiz ? ' has-wellness-raffle' : ''}">
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
                isInBody || isCelaviveRaffle || isWellnessQuiz || isGroupDelivery
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
                isGroupDelivery
                  ? `
                    <div class="link-stack modern-link-stack">
                      <label>Group Delivery Link</label>
                      ${renderEventUrlControl({
                        url: groupDeliveryUrl,
                        openHref: eventData.groupDeliveryPath,
                        copyLabel: 'Group Delivery link',
                        openLabel: 'Open Group Delivery'
                      })}
                    </div>
                  `
                  : ''
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
                isInBody || isCelaviveRaffle || isWellnessQuiz || isGroupDelivery
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
          ${isWellnessQuiz ? renderWellnessRaffleEditor(eventData) : ''}
          ${isGroupDelivery ? renderGroupDeliveryAdminPanel(eventData, previews) : ''}
        </div>

        <aside class="detail-side-stack">
          ${
            isInBody || isCelaviveRaffle || isWellnessQuiz || isGroupDelivery
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
            isGroupDelivery
              ? `
                <section class="workspace-panel qr-card qr-card-active">
                  <span class="section-kicker">Group Delivery QR</span>
                  <h3>Group Delivery QR code</h3>
                  <p>Share this QR so C/O users can log in and submit their own cycle entries.</p>
                  <div class="qr-panel">
                    <div class="qr-image-stack">
                      <img id="groupDeliveryQrImage" class="qr-image" alt="Group Delivery QR code">
                      <img class="qr-brand-mark" src="/assets/logo/Genesys_Logo2.svg" alt="" aria-hidden="true">
                    </div>
                  </div>
                  <a id="groupDeliveryQrOpenLink" class="button-link button-link-secondary" target="_blank" rel="noreferrer" href="${escapeAttribute(buildQrUrl(groupDeliveryUrl))}">Open QR in new tab</a>
                </section>
              `
              : ''
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
      ${eventData.isArchived || isInBody || isWellnessQuiz || isGroupDelivery ? '' : renderRsvpSettingsModal(eventData)}
    `
  });
}

function renderGroupDeliveryAdminPanel(eventData, previews = {}) {
  const users = previews.groupDeliveryUsers || [];
  const cycles = previews.groupDeliveryCycles || [];
  const currentCycle = previews.groupDeliveryCurrentCycle || cycles.find((cycle) => cycle.status === 'open') || {};

  return `
    <section class="workspace-panel workspace-panel-large group-delivery-admin-panel">
      <div class="workspace-heading">
        <div>
          <span class="section-kicker">Group Delivery</span>
          <h2>C/O access and cycles</h2>
          <p>Approve PIN resets and submit the current cycle when entries are ready for the next blank cycle.</p>
        </div>
        <span class="response-meta-pill">Cycle ${escapeHtml(currentCycle.cycleNumber || '1')}</span>
      </div>
      <div class="group-delivery-admin-actions">
        <button
          id="submitGroupDeliveryCycleButton"
          type="button"
          class="button-link"
          data-event-id="${escapeAttribute(eventData.eventId)}"
        >Mark Current Cycle Submitted</button>
        <div id="groupDeliveryAdminStatus" class="status" aria-live="polite"></div>
      </div>
      <div class="group-delivery-admin-grid">
        <section class="group-delivery-admin-block">
          <strong>C/O Users</strong>
          ${users.length ? `
            <div class="group-delivery-user-list">
              ${users.map((user) => `
                <div class="group-delivery-user-row">
                  <span>${escapeHtml(user.co)}</span>
                  <span>${escapeHtml(user.registered ? 'Registered' : 'Not registered')}</span>
                  <span>${escapeHtml(formatGroupDeliveryStatus(user.status))}</span>
                  <button
                    type="button"
                    class="button-link button-link-secondary"
                    data-reset-group-delivery-pin
                    data-co="${escapeAttribute(user.co)}"
                  >Reset PIN</button>
                </div>
              `).join('')}
            </div>
          ` : '<p class="muted-copy">No C/O users have registered yet.</p>'}
        </section>
        <section class="group-delivery-admin-block">
          <strong>Cycles</strong>
          ${cycles.length ? `
            <div class="group-delivery-cycle-list">
              ${cycles.map((cycle) => `
                <div class="group-delivery-history-row">
                  <span>Cycle ${escapeHtml(cycle.cycleNumber)}</span>
                  <span>${escapeHtml(cycle.status === 'submitted' ? 'Submitted' : 'Open')}</span>
                  <span>${escapeHtml(cycle.submittedAt ? formatMetricDateTime(cycle.submittedAt) : formatMetricDateTime(cycle.openedAt))}</span>
                </div>
              `).join('')}
            </div>
          ` : '<p class="muted-copy">Cycle 1 will open automatically.</p>'}
        </section>
      </div>
    </section>
  `;
}

function renderWellnessRaffleEditor(eventData) {
  const config = eventData.wellnessRaffle || {
    enabled: false,
    title: 'Spin to Win',
    losingLabel: 'Better luck next time',
    losingColor: '#7457d9',
    losingSliceCount: 0,
    winChance: DEFAULT_WELLNESS_RAFFLE_WIN_CHANCE,
    losingVisualChance: 100 - DEFAULT_WELLNESS_RAFFLE_WIN_CHANCE,
    prizes: []
  };
  const winChance = getWellnessRaffleWinChance(config);
  const prizes = config.prizes.length ? config.prizes : [
    { id: '', label: 'Grand Prize', color: '#e05a9d', quantity: 1, chance: 50, awarded: 0 },
    { id: '', label: 'Special Prize', color: '#f2a83b', quantity: 1, chance: 50, awarded: 0 }
  ];

  return `
    <section class="workspace-panel workspace-panel-large wellness-raffle-editor">
      <div class="workspace-heading">
        <div>
          <span class="section-kicker">Spin-wheel raffle</span>
          <h2>Customize the attendee wheel</h2>
          <p>The wheel has a configurable overall win chance. Distribute 100% of that winning pool across your prizes.</p>
        </div>
        <span class="response-meta-pill">${winChance}% win chance</span>
      </div>
      <form id="wellnessRaffleSettingsForm" class="wellness-raffle-settings-form">
        <label class="settings-toggle">
          <input id="wellnessRaffleEnabled" type="checkbox" ${config.enabled ? 'checked' : ''}>
          <span>Enable wheel after quiz submission</span>
        </label>
        <div class="grid wellness-raffle-base-fields">
          <div class="field full">
            <label for="wellnessRaffleTitle">Wheel title</label>
            <input id="wellnessRaffleTitle" maxlength="80" required value="${escapeAttribute(config.title)}">
          </div>
          <div class="field">
            <label for="wellnessRaffleWinChance">Winning rate</label>
            <div class="percentage-input"><input id="wellnessRaffleWinChance" type="number" min="1" max="99" step="1" required value="${escapeAttribute(winChance)}"><span>%</span></div>
          </div>
          <div class="field">
            <label for="wellnessRaffleLosingLabel">Losing slice label</label>
            <input id="wellnessRaffleLosingLabel" maxlength="60" required value="${escapeAttribute(config.losingLabel)}">
          </div>
          <div class="field color-field">
            <label for="wellnessRaffleLosingColor">Losing slice color</label>
            <input id="wellnessRaffleLosingColor" type="color" value="${escapeAttribute(config.losingColor)}">
          </div>
          <div class="field">
            <label for="wellnessRaffleLosingSliceCount">Better luck slices</label>
            <input id="wellnessRaffleLosingSliceCount" type="number" min="0" max="24" step="1" value="${escapeAttribute(config.losingSliceCount || 0)}">
            <small>Use 0 for auto. This changes only how the losing chance is displayed.</small>
          </div>
          <div class="field">
            <label for="wellnessRaffleLosingVisualChance">Better luck visual size</label>
            <div class="percentage-input"><input id="wellnessRaffleLosingVisualChance" type="number" min="1" max="${100 - winChance}" step="1" value="${escapeAttribute(config.losingVisualChance || (100 - winChance))}"><span>%</span></div>
            <small id="wellnessRaffleLosingVisualHint">Visual only. Real winning chance stays ${winChance}%.</small>
          </div>
        </div>
        <div class="wellness-prize-heading">
          <strong>Winning prizes</strong>
          <div class="wellness-prize-heading-actions">
            <button id="distributeWellnessPrizesButton" type="button" class="button-link button-link-secondary">Distribute Evenly</button>
            <span id="wellnessPrizeChanceTotal">${prizes.reduce((sum, prize) => sum + Number(prize.chance || 0), 0)}% of 100% winning pool</span>
          </div>
        </div>
        <div id="wellnessPrizeList" class="wellness-prize-list">
          ${prizes.map((prize) => renderWellnessPrizeEditorRow(prize)).join('')}
        </div>
        <button id="addWellnessPrizeButton" type="button" class="button-link button-link-secondary">Add Prize</button>
        <section class="wellness-raffle-preview-panel" aria-label="Spin wheel preview">
          <div class="wellness-raffle-preview-copy">
            <strong>Preview before saving</strong>
            <span>This updates as you edit. The real spin result is still chosen by the server after submission.</span>
          </div>
          <div id="wellnessRafflePreview" class="wellness-raffle-preview"></div>
        </section>
        <div class="wellness-raffle-form-actions">
          <div id="wellnessRaffleSettingsStatus" class="status" aria-live="polite"></div>
          <button type="submit">Save Wheel</button>
        </div>
      </form>
    </section>
  `;
}

function renderWellnessPrizeEditorRow(prize = {}) {
  const awarded = Number(prize.awarded || 0);
  return `
    <div class="wellness-prize-row" data-wellness-prize data-prize-id="${escapeAttribute(prize.id || '')}" data-awarded="${awarded}">
      <div class="field wellness-prize-label">
        <label>Prize label</label>
        <input data-prize-label maxlength="60" required value="${escapeAttribute(prize.label || '')}">
      </div>
      <div class="field color-field">
        <label>Color</label>
        <input data-prize-color type="color" value="${escapeAttribute(prize.color || '#e05a9d')}">
      </div>
      <div class="field">
        <label>Quantity</label>
        <input data-prize-quantity type="number" min="${Math.max(1, awarded)}" step="1" required value="${escapeAttribute(prize.quantity || 1)}">
      </div>
      <div class="field">
        <label>Winning-pool share</label>
        <div class="percentage-input"><input data-prize-chance type="number" min="0.01" max="100" step="0.01" required value="${escapeAttribute(prize.chance || '')}"><span>%</span></div>
      </div>
      <div class="field">
        <label>Wheel slices</label>
        <input data-prize-visual-slices type="number" min="1" max="24" step="1" required value="${escapeAttribute(prize.visualSliceCount || 1)}">
      </div>
      <button type="button" class="wellness-prize-remove" data-remove-wellness-prize ${awarded ? 'disabled title="Awarded prizes cannot be deleted"' : ''} aria-label="Remove prize">Remove</button>
      ${awarded ? `<small>${awarded} awarded · ${Number(prize.remaining || 0)} remaining</small>` : ''}
    </div>
  `;
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
      <div class="event-header-schedule-field event-header-location-field">
        <label for="manageLocation">Location</label>
        <input id="manageLocation" name="location" type="text" value="${escapeAttribute(eventData.location || '')}" required>
      </div>
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
            <div id="wellnessQuizFormStage">
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
            </div>
            <div id="wellnessWheelStage" hidden></div>
            ${renderPoweredFooter('footer-note auth-legal public-form-powered')}
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderPublicGroupDeliveryPage(eventData, currentCycle = {}) {
  const eventDateTime = eventData.displayDateTime || formatMetricDateTime(eventData.dateTime);
  const hasSession = Boolean(getGroupDeliverySession());

  return `
    <div class="public-shell-modern">
      <section class="public-hero-modern">
        <div class="public-slideshow" aria-hidden="true">
          ${publicCelaviveSlides.map((src, index) => `<img src="${src}" alt="" class="${index === 0 ? 'is-active' : ''}">`).join('')}
        </div>
        <div class="public-hero-overlay"></div>
        <div class="public-hero-content">
          <div class="public-logo-mark">
            <img src="/assets/logo/Genesys_Logo2.svg" alt="GeneSys logo">
          </div>
          <span class="eyebrow">Group Delivery</span>
          <h1 data-dynamic-title>${escapeHtml(eventData.eventLabel || 'Group Delivery')}</h1>
          <p class="lede">Log in with your C/O PIN to view your own cycle history and submit your current delivery entry.</p>
          <div class="event-meta">
            <span>${escapeHtml(eventData.location || '')}</span>
            <span>${escapeHtml(eventDateTime)}</span>
            <span>Cycle ${escapeHtml(currentCycle.cycleNumber || '1')}</span>
          </div>
        </div>
      </section>

      <section class="public-form-shell">
        <div class="form-card public-form-card group-delivery-card">
          <div id="groupDeliveryAuthStage" ${hasSession ? 'hidden' : ''}>
            <div class="panel-head">
              <span class="section-kicker">C/O Access</span>
              <h2>Enter your C/O</h2>
              <p>Your C/O identifies your own delivery records. Your PIN keeps your entries private.</p>
            </div>
            <form id="groupDeliveryCoForm" class="modern-form">
              <div class="field full">
                <label for="groupDeliveryCo">C/O <span class="required">*</span></label>
                <input id="groupDeliveryCo" name="co" type="text" autocomplete="organization" required>
              </div>
              <div class="form-submit-row">
                <button type="submit">Continue</button>
                <div id="groupDeliveryAuthStatus" class="status" aria-live="polite"></div>
              </div>
            </form>
            <form id="groupDeliveryPinForm" class="modern-form group-delivery-pin-form" hidden>
              <input id="groupDeliveryPinCo" name="co" type="hidden">
              <div class="field full">
                <label for="groupDeliveryPin">PIN <span class="required">*</span></label>
                <input id="groupDeliveryPin" name="pin" type="password" inputmode="numeric" pattern="\\d{4,6}" minlength="4" maxlength="6" required>
              </div>
              <div id="groupDeliveryConfirmPinField" class="field full" hidden>
                <label for="groupDeliveryConfirmPin">Confirm PIN <span class="required">*</span></label>
                <input id="groupDeliveryConfirmPin" name="confirmPin" type="password" inputmode="numeric" pattern="\\d{4,6}" minlength="4" maxlength="6">
              </div>
              <div class="form-submit-row">
                <button type="submit">Log In</button>
                <button id="groupDeliveryForgotPinButton" type="button" class="button-link button-link-secondary">Forgot PIN</button>
              </div>
            </form>
          </div>
          <div id="groupDeliveryWorkspace" ${hasSession ? '' : 'hidden'}>
            <div class="group-delivery-loading">Loading your records...</div>
          </div>
          ${renderPoweredFooter('footer-note auth-legal public-form-powered')}
        </div>
      </section>
    </div>
  `;
}

function showGroupDeliveryPinStage(co, mode, message = '') {
  const coForm = document.getElementById('groupDeliveryCoForm');
  const pinForm = document.getElementById('groupDeliveryPinForm');
  const pinCo = document.getElementById('groupDeliveryPinCo');
  const confirmField = document.getElementById('groupDeliveryConfirmPinField');
  const confirmInput = document.getElementById('groupDeliveryConfirmPin');
  const submitButton = pinForm ? pinForm.querySelector('button[type="submit"]') : null;
  const status = document.getElementById('groupDeliveryAuthStatus');

  if (!pinForm || !coForm || !pinCo || !confirmField || !confirmInput || !submitButton) return;

  if (mode === 'pending-reset') {
    pinForm.hidden = true;
    setStatus(status, message || 'Your PIN reset is waiting for admin approval.', 'is-error');
    return;
  }

  coForm.hidden = true;
  pinForm.hidden = false;
  pinForm.dataset.mode = mode === 'register' ? 'register' : 'login';
  pinCo.value = co;
  confirmField.hidden = mode !== 'register';
  confirmInput.required = mode === 'register';
  submitButton.textContent = mode === 'register' ? 'Create PIN' : 'Log In';
  setStatus(status, mode === 'register' ? 'Create a unique 4-6 digit PIN.' : 'Enter your PIN to continue.', '');
}

function renderGroupDeliveryWorkspace(eventData, result) {
  const authStage = document.getElementById('groupDeliveryAuthStage');
  const workspace = document.getElementById('groupDeliveryWorkspace');

  if (!workspace) return;

  if (authStage) authStage.hidden = true;
  workspace.hidden = false;
  workspace.innerHTML = renderGroupDeliveryRecordWorkspace(eventData, result);
}

function renderGroupDeliveryRecordWorkspace(eventData, result = {}) {
  const current = result.currentEntry || {};
  const history = result.history || [];
  const user = result.user || {};
  const cycle = result.currentCycle || {};

  return `
    <div class="panel-head">
      <span class="section-kicker">Cycle ${escapeHtml(cycle.cycleNumber || '')}</span>
      <h2>Your Group Delivery Entry</h2>
      <p>Only records for ${escapeHtml(user.co || '')} are shown here.</p>
    </div>
    <div class="group-delivery-session-bar">
      <strong>${escapeHtml(user.co || '')}</strong>
      <button id="groupDeliveryLogoutButton" type="button" class="button-link button-link-secondary">Logout</button>
    </div>
    ${history.length ? `
      <section class="group-delivery-history">
        <strong>Submitted cycle history</strong>
        ${history.map((entry) => `
          <div class="group-delivery-history-row">
            <span>Cycle ${escapeHtml(entry.cycleNumber)}</span>
            <span>${escapeHtml(entry.fullName || 'No name saved')}</span>
            <span>${escapeHtml(entry.updatedAt ? formatMetricDateTime(entry.updatedAt) : '')}</span>
          </div>
        `).join('')}
      </section>
    ` : ''}
    <form id="groupDeliveryEntryForm" class="modern-form">
      <div class="grid">
        <div class="field full">
          <label for="groupDeliveryEntryCo">C/O</label>
          <input id="groupDeliveryEntryCo" name="co" type="text" value="${escapeAttribute(user.co || '')}" readonly>
        </div>
        ${renderGroupDeliveryEntryFields(current)}
      </div>
      <div class="form-submit-row">
        <button type="submit">Save Entry</button>
        <div id="groupDeliveryEntryStatus" class="status" aria-live="polite"></div>
      </div>
    </form>
  `;
}

function renderGroupDeliveryEntryFields(entry = {}) {
  return `
    <div class="field full">
      <label for="fullName">Full Name <span class="required">*</span></label>
      <input id="fullName" name="fullName" type="text" autocomplete="name" required value="${escapeAttribute(entry.fullName || '')}">
    </div>
    <div class="field">
      <label for="birthday">Birthday <span class="required">*</span></label>
      <input id="birthday" name="birthday" type="date" data-mobile-picker required value="${escapeAttribute(entry.birthday || '')}">
    </div>
    <div class="field">
      <label for="mobileNumber">Mobile Number <span class="required">*</span></label>
      <input id="mobileNumber" name="mobileNumber" type="tel" inputmode="numeric" placeholder="09XXXXXXXXX" required value="${escapeAttribute(entry.mobileNumber || '')}">
    </div>
    <div class="field">
      <label for="emailAddress">Email Address <span class="required">*</span></label>
      <input id="emailAddress" name="emailAddress" type="email" autocomplete="email" required value="${escapeAttribute(entry.emailAddress || '')}">
    </div>
    <div class="field">
      <label for="profession">Profession <span class="required">*</span></label>
      <select id="profession" name="profession" required>
        <option value="">Select profession</option>
        ${renderProfessionOptions(entry.profession || '')}
      </select>
    </div>
    <div class="field full">
      <label for="address">Address <span class="required">*</span></label>
      <textarea id="address" name="address" required>${escapeHtml(entry.address || '')}</textarea>
    </div>
  `;
}

function buildWellnessWheelSegments(raffle) {
  const prizes = (raffle.prizes || []).filter((prize) => prize.available && Number(prize.effectiveChance) > 0);
  if (!prizes.length) {
    return [{ id: '', visualId: 'lose_0', type: 'lose', label: raffle.losingLabel, color: raffle.losingColor, chance: 100 }];
  }
  const actualPrizeChanceTotal = prizes.reduce((sum, prize) => sum + Number(prize.effectiveChance || 0), 0);
  const winChance = getWellnessRaffleWinChance(raffle);
  const losingChanceTotal = Math.max(1, Math.min(100 - winChance, Number(raffle.losingVisualChance || (100 - winChance))));
  const visualPrizeChanceTotal = Math.max(0, 100 - losingChanceTotal);
  const losingSliceCount = Math.max(1, Math.min(24, Math.floor(Number(raffle.losingSliceCount || prizes.length))));
  const losingSliceChance = losingChanceTotal / losingSliceCount;
  const visualGroups = [
    {
      key: 'lose',
      remaining: losingChanceTotal > 0 ? losingSliceCount : 0,
      total: losingChanceTotal > 0 ? losingSliceCount : 0,
      makeSegment: (sliceIndex) => ({
        id: '',
        visualId: `lose_${sliceIndex}`,
        type: 'lose',
        label: raffle.losingLabel,
        color: raffle.losingColor,
        chance: losingSliceChance
      })
    },
    ...prizes.map((prize, prizeIndex) => {
      const sliceCount = Math.max(1, Math.min(24, Math.floor(Number(prize.visualSliceCount || 1))));
      const visualPrizeChance = actualPrizeChanceTotal > 0
        ? Number(prize.effectiveChance) / actualPrizeChanceTotal * visualPrizeChanceTotal
        : 0;
      const chance = visualPrizeChance / sliceCount;
      return {
        key: prize.id || `prize_${prizeIndex}`,
        remaining: sliceCount,
        total: sliceCount,
        makeSegment: (sliceIndex) => ({
          ...prize,
          type: 'prize',
          visualId: `${prize.id || `prize_${prizeIndex}`}_${sliceIndex}`,
          chance
        })
      };
    })
  ];
  const totalSlices = visualGroups.reduce((sum, group) => sum + group.total, 0);
  const placed = new Map(visualGroups.map((group) => [group.key, 0]));
  const segments = [];
  for (let slot = 0; slot < totalSlices; slot += 1) {
    const group = visualGroups
      .filter((item) => item.remaining > 0)
      .sort((left, right) => {
        const leftDeficit = (left.total * (slot + 1) / totalSlices) - placed.get(left.key);
        const rightDeficit = (right.total * (slot + 1) / totalSlices) - placed.get(right.key);
        return rightDeficit - leftDeficit;
      })[0];
    const sliceIndex = placed.get(group.key);
    segments.push(group.makeSegment(sliceIndex));
    placed.set(group.key, sliceIndex + 1);
    group.remaining -= 1;
  }
  return segments;
}

function getWellnessWheelLegendSegments(segments) {
  const seen = new Set();
  return segments.filter((segment) => {
    const key = segment.type === 'lose' ? 'lose' : `prize:${segment.id || segment.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getReadableTextColor(hexColor) {
  const normalized = String(hexColor || '').trim().replace(/^#/, '');
  const fullHex = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;
  if (!/^[0-9a-f]{6}$/i.test(fullHex)) return '#ffffff';
  const red = parseInt(fullHex.slice(0, 2), 16);
  const green = parseInt(fullHex.slice(2, 4), 16);
  const blue = parseInt(fullHex.slice(4, 6), 16);
  const luminance = ((red * 299) + (green * 587) + (blue * 114)) / 1000;
  return luminance > 135 ? '#141414' : '#ffffff';
}

function renderWellnessWheel(raffle, options = {}) {
  const isPreview = Boolean(options.preview);
  const segments = buildWellnessWheelSegments(raffle);
  let cursor = 0;
  const positionedSegments = segments.map((segment) => {
    const start = cursor;
    cursor += segment.chance;
    return { ...segment, start, end: cursor, mid: start + (segment.chance / 2) };
  });
  const gradient = positionedSegments.map((segment) => {
    const start = segment.start;
    const end = segment.end;
    return `${segment.color} ${start}% ${end}%`;
  }).join(', ');
  return `
    <div class="wellness-wheel-experience${isPreview ? ' is-preview' : ''}">
      <div class="panel-head wellness-wheel-heading">
        <span class="section-kicker">${isPreview ? 'Wheel preview' : 'Wellness raffle'}</span>
        <h2>${escapeHtml(raffle.title)}</h2>
        <p>${isPreview ? 'Unsaved preview using the current labels, colors, and prize shares.' : raffle.soldOut ? 'All prizes have been awarded.' : 'Your wellness check is complete. Tap once to reveal your result.'}</p>
      </div>
      <div class="wellness-wheel-wrap">
        <div class="wellness-wheel-pointer" aria-hidden="true"></div>
        <div id="wellnessSpinWheel" class="wellness-spin-wheel" style="background: conic-gradient(${escapeAttribute(gradient)})" aria-hidden="true">
          ${positionedSegments.map((segment) => {
            const sliceAngle = segment.mid * 3.6;
            const labelRotation = sliceAngle > 90 && sliceAngle < 270 ? 90 : -90;
            const labelColor = getReadableTextColor(segment.color);
            const labelShadow = labelColor === '#ffffff' ? '0 1px 3px rgba(0,0,0,.34)' : '0 1px 2px rgba(255,255,255,.42)';
            const label = segment.type === 'lose' && segment.chance < 18 ? '' : segment.label;
            return `
              <span
                class="wellness-wheel-slice-label"
                style="--slice-angle:${sliceAngle.toFixed(2)}deg; --label-rotation:${labelRotation}deg; --label-color:${escapeAttribute(labelColor)}; --label-shadow:${escapeAttribute(labelShadow)};"
                title="${escapeAttribute(segment.label)}"
              ><span>${escapeHtml(label)}</span></span>
            `;
          }).join('')}
        </div>
        <div class="wellness-wheel-center" aria-hidden="true">SPIN</div>
      </div>
      <div class="wellness-wheel-legend">
        ${getWellnessWheelLegendSegments(segments).map((segment) => `<span><i style="background:${escapeAttribute(segment.color)}"></i>${escapeHtml(segment.label)}</span>`).join('')}
      </div>
      ${isPreview ? '' : `
        <button id="wellnessSpinButton" type="button" ${raffle.soldOut ? 'disabled' : ''}>${raffle.soldOut ? 'Prizes Sold Out' : 'Spin the Wheel'}</button>
        <div id="wellnessSpinResult" class="wellness-spin-result" aria-live="polite"></div>
      `}
    </div>
  `;
}

function getWellnessSpinStorageKey(eventId) {
  return `wellness-spin:${eventId}`;
}

function showWellnessWheel(eventData, spinToken) {
  const raffle = eventData.wellnessRaffle;
  const formStage = document.getElementById('wellnessQuizFormStage');
  const wheelStage = document.getElementById('wellnessWheelStage');
  if (!raffle || !raffle.enabled || !wheelStage) return;
  if (formStage) formStage.hidden = true;
  wheelStage.hidden = false;
  wheelStage.innerHTML = renderWellnessWheel(raffle);
  attachWellnessSpinHandler(eventData, spinToken);
}

function attachWellnessSpinHandler(eventData, spinToken) {
  const button = document.getElementById('wellnessSpinButton');
  if (!button || !spinToken) return;
  button.addEventListener('click', async () => {
    const resultElement = document.getElementById('wellnessSpinResult');
    const wheel = document.getElementById('wellnessSpinWheel');
    try {
      setButtonLoading(button, true, 'Spinning...');
      const result = await fetchJson(`/events/${eventData.eventId}/wellness-raffle/spin`, {
        method: 'POST', body: { spinToken }
      });
      const segments = buildWellnessWheelSegments(eventData.wellnessRaffle);
      let cursor = 0;
      const positionedSegments = segments.map((segment) => {
        const start = cursor;
        cursor += segment.chance;
        return { ...segment, start };
      });
      const matchingSegments = positionedSegments.filter((segment) => (
        result.won ? segment.id === result.prizeId : segment.type === 'lose'
      ));
      const targetSegment = matchingSegments[Math.floor(Math.random() * matchingSegments.length)] || positionedSegments[0];
      const targetStart = targetSegment ? targetSegment.start : 0;
      const targetSize = targetSegment ? targetSegment.chance : 100 - getWellnessRaffleWinChance(eventData.wellnessRaffle);
      const targetDegrees = (targetStart + targetSize / 2) * 3.6;
      wheel.style.setProperty('--spin-rotation', `${(5 * 360) + (360 - targetDegrees)}deg`);
      wheel.classList.add('is-spinning');
      const reveal = () => {
        resultElement.innerHTML = result.won
          ? `<strong>Congratulations!</strong><span>You won ${escapeHtml(result.prizeLabel)}.</span>`
          : `<strong>${escapeHtml(eventData.wellnessRaffle.losingLabel)}</strong><span>Thank you for completing the wellness check.</span>`;
        resultElement.classList.add(result.won ? 'is-win' : 'is-lose');
        button.hidden = true;
      };
      if (result.repeated || window.matchMedia('(prefers-reduced-motion: reduce)').matches) reveal();
      else window.setTimeout(reveal, 4100);
    } catch (error) {
      setStatus(resultElement, error.message, 'is-error');
      setButtonLoading(button, false, 'Spin the Wheel');
    }
  });
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
            : isGroupDelivery
              ? `<a href="${escapeAttribute(eventData.groupDeliveryPath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary">Open Group Delivery</a>`
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
    ${mode === 'wellness-quiz' && row['Spin Token'] ? `
      <button
        type="button"
        class="button-link button-link-secondary response-reset-spin-button"
        data-reset-wellness-spin
        data-row-number="${escapeAttribute(rowNumber)}"
        data-response-name="${escapeAttribute(responseName)}"
      >Grant Spin</button>
    ` : ''}
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
        <a href="/qr-generator" data-link class="sidebar-link${activeView === 'qr-generator' ? ' is-active' : ''}">
          <span class="sidebar-link-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.8"/>
              <rect x="14" y="5" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.8"/>
              <rect x="5" y="14" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.8"/>
              <path d="M14 14H16V16H14V14Z" fill="currentColor"/>
              <path d="M18 14H19V19H14V18H17V16H18V14Z" fill="currentColor"/>
            </svg>
          </span>
          <span class="sidebar-link-label">QR Generator</span>
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
      (eventData.wellnessQuizPath ? 1 : 0) +
      (eventData.groupDeliveryPath ? 1 : 0),
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
  const isGroupDelivery = isGroupDeliveryEvent(eventData);

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
            : isGroupDelivery
              ? `
                <a href="${escapeAttribute(eventData.groupDeliveryPath)}" target="_blank" rel="noreferrer" class="button-link button-link-secondary">
                  <span class="selected-event-action-icon">${renderEventActionIcon('external')}</span>
                  <span>Open Group Delivery</span>
                </a>
                <a href="/events/${encodeURIComponent(eventData.eventId)}" data-link class="button-link button-link-secondary">
                  <span class="selected-event-action-icon">${renderEventActionIcon('responses')}</span>
                  <span>Manage C/O & Cycles</span>
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

function isGroupDeliveryEvent(eventData) {
  return String(eventData && eventData.eventType ? eventData.eventType : '').trim() === GROUP_DELIVERY_EVENT_TYPE;
}

function isStandardRsvpEvent(eventData) {
  return STANDARD_RSVP_EVENT_TYPES.includes(String(eventData && eventData.eventType ? eventData.eventType : '').trim());
}

function getEventTypeDisplayLabel(type) {
  return isInBodyEvent({ eventType: type }) ? INBODY_EVENT_DISPLAY_LABEL : type;
}

function formatGroupDeliveryStatus(status) {
  const normalized = String(status || '').trim();
  if (normalized === 'reset-requested') return 'Reset Requested';
  if (normalized === 'reset-approved') return 'Reset Approved';
  if (normalized === 'inactive') return 'Inactive';
  return 'Active';
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

async function groupDeliveryFetchJson(path, options = {}) {
  const token = getGroupDeliverySession();

  if (!token) {
    throw new Error('Please log in with your C/O PIN.');
  }

  return fetchJson(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
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

function getGroupDeliverySession() {
  try {
    return window.localStorage.getItem(GROUP_DELIVERY_SESSION_KEY) || '';
  } catch (error) {
    return '';
  }
}

function setGroupDeliverySession(token) {
  try {
    window.localStorage.setItem(GROUP_DELIVERY_SESSION_KEY, token);
  } catch (error) {
    // Local Storage can be unavailable in private browsing; the next request will prompt login again.
  }
}

function clearGroupDeliverySession() {
  try {
    window.localStorage.removeItem(GROUP_DELIVERY_SESSION_KEY);
  } catch (error) {
    // Ignore storage cleanup failures.
  }
}

function renderProfessionOptions(selectedValue = '') {
  return state.config.professions
    .map((profession) => `<option value="${escapeAttribute(profession)}"${profession === selectedValue ? ' selected' : ''}>${escapeHtml(profession)}</option>`)
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

function buildBrandedQrSvg(title, qrUrl, targetUrl) {
  const label = title || 'GeneSys QR';
  const logoUrl = `${window.location.origin}/assets/logo/Genesys_Logo2.svg`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#32497d" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="1080" height="1350" fill="#edf3ff"/>
  <circle cx="130" cy="110" r="240" fill="#5c66ff" opacity="0.13"/>
  <circle cx="960" cy="1260" r="220" fill="#e1f86f" opacity="0.15"/>
  <rect x="160" y="120" width="760" height="1110" rx="72" fill="#ffffff" filter="url(#softShadow)"/>
  <text x="540" y="225" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="6" fill="#5160e8">QR ACCESS</text>
  <text x="540" y="302" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="800" fill="#121826">${escapeSvgText(label)}</text>
  <rect x="250" y="395" width="580" height="580" rx="72" fill="#f8fbff" stroke="#d6dcea" stroke-width="4"/>
  <image href="${escapeAttribute(qrUrl)}" x="310" y="455" width="460" height="460" preserveAspectRatio="xMidYMid meet"/>
  <circle cx="540" cy="685" r="78" fill="#ffffff" filter="url(#softShadow)"/>
  <image href="${escapeAttribute(logoUrl)}" x="495" y="640" width="90" height="90" preserveAspectRatio="xMidYMid meet"/>
  <foreignObject x="230" y="1032" width="620" height="116">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; font-size: 25px; line-height: 1.45; color: #6f7992; text-align: center; word-break: break-word;">${escapeHtml(targetUrl)}</div>
  </foreignObject>
</svg>`;
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

function downloadTextFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugifyTitle(value) {
  return String(value || 'genesys')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'genesys';
}

function escapeSvgText(value) {
  return escapeHtml(value).replace(/\n/g, ' ');
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
    'Comments / Health Concerns',
    'Allowed Spins',
    'Completed Spins',
    'Latest Spin Result'
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
