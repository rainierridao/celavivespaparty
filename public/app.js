const form = document.getElementById('registrationForm');
const professionSelect = document.getElementById('profession');
const submitButton = document.getElementById('submitButton');
const statusEl = document.getElementById('status');
const configBadge = document.getElementById('configBadge');
const apiBaseCandidates = ['/.netlify/functions/api', '/api'];
let activeApiBase = apiBaseCandidates[0];

initialize();

async function initialize() {
  try {
    const response = await apiFetch('/config');
    const config = await response.json();

    renderProfessions(config.professions || []);

    if (config.googleSheetsConfigured) {
      configBadge.textContent = 'Google Sheets is connected and ready.';
      configBadge.className = 'config-badge ready';
    } else {
      configBadge.textContent = 'Google Sheets is not configured yet. Add your .env file and service account JSON.';
      configBadge.className = 'config-badge missing';
    }
  } catch (error) {
    configBadge.textContent = 'Unable to load app configuration.';
    configBadge.className = 'config-badge missing';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    fullName: form.fullName.value.trim(),
    birthday: form.birthday.value,
    mobileNumber: form.mobileNumber.value.trim(),
    emailAddress: form.emailAddress.value.trim(),
    address: form.address.value.trim(),
    profession: form.profession.value
  };

  setStatus('', '');

  if (!payload.fullName || !payload.birthday || !payload.mobileNumber || !payload.emailAddress || !payload.address || !payload.profession) {
    setStatus('Please complete all required fields.', 'is-error');
    return;
  }

  if (!/^(\+63|0)9\d{9}$/.test(payload.mobileNumber.replace(/[\s-]/g, ''))) {
    setStatus('Please enter a valid Philippine mobile number.', 'is-error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Saving...';

  try {
    const response = await apiFetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Something went wrong while saving the registration.');
    }

    form.reset();
    setStatus(result.message || 'Registration saved successfully.', 'is-success');
  } catch (error) {
    setStatus(error.message || 'Something went wrong while saving the registration.', 'is-error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Save Registration';
  }
});

function renderProfessions(professions) {
  professions.forEach((profession) => {
    const option = document.createElement('option');
    option.value = profession;
    option.textContent = profession;
    professionSelect.appendChild(option);
  });
}

function setStatus(message, className) {
  statusEl.textContent = message;
  statusEl.className = `status${className ? ` ${className}` : ''}`;
}

async function apiFetch(path, options) {
  let lastError;

  for (const base of apiBaseCandidates) {
    try {
      const response = await fetch(`${base}${path}`, options);

      if (response.status === 404) {
        lastError = new Error(`API route not found at ${base}${path}`);
        continue;
      }

      activeApiBase = base;
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to reach the API.');
}
