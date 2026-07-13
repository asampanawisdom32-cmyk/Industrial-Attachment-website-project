const ROLE_LABEL_TO_KEY = {
  Admin: 'admin',
  'School Supervisor': 'school_supervisor',
  'Workplace Supervisor': 'workplace_supervisor',
  Student: 'student',
};

function mapRoleLabel(label) {
  return ROLE_LABEL_TO_KEY[label] || 'student';
}

function showMessage(container, message, type) {
  if (!container) return;
  container.textContent = message || '';
  container.className = 'auth-message' + (type ? ' auth-message-' + type : '');
  container.hidden = !message;
}

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

/* ─── Field Validation Helpers ─── */

function validateEmail(value) {
  if (!value) return 'Email is required.';
  // Basic email regex — matches most edu/domain patterns
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
  return '';
}

function validatePassword(value) {
  if (!value) return 'Password is required.';
  if (value.length < 6) return 'Password must be at least 6 characters.';
  return '';
}

function clearFieldValidation(wrap) {
  wrap.classList.remove('has-error', 'has-valid');
  var hint = wrap.parentNode.querySelector('.field-hint');
  if (hint) {
    hint.className = 'field-hint';
    hint.textContent = '';
  }
}

function getOrCreateHint(wrap) {
  var hint = wrap.parentNode.querySelector('.field-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.className = 'field-hint';
    wrap.parentNode.appendChild(hint);
  }
  return hint;
}

function setFieldError(wrap, message) {
  wrap.classList.remove('has-valid');
  wrap.classList.add('has-error');
  var hint = getOrCreateHint(wrap);
  hint.className = 'field-hint field-hint-error';
  hint.textContent = message;
}

function setFieldValid(wrap) {
  wrap.classList.remove('has-error');
  wrap.classList.add('has-valid');
  var hint = wrap.parentNode.querySelector('.field-hint');
  if (hint) {
    hint.className = 'field-hint field-hint-valid';
    hint.textContent = '\u2713';
  }
}

function validateName(value) {
  if (!value) return 'Full name is required.';
  if (value.trim().length < 2) return 'Name must be at least 2 characters.';
  return '';
}

function validateStudentId(value) {
  if (!value) return 'Index number is required for student accounts.';
  if (value.trim().length < 3) return 'Enter a valid index number.';
  return '';
}

function validateDepartment(value) {
  if (!value) return 'Department is required for student accounts.';
  return '';
}

function setupFieldValidation() {
  var emailInput = document.getElementById('login-email');
  var pwInput = document.getElementById('login-password');
  var roleSelect = document.getElementById('login-role');

  // Validators for each field
  var validators = [];

  if (emailInput) {
    var emailWrap = emailInput.closest('.premium-input-wrap');
    if (emailWrap) {
      emailInput.addEventListener('blur', function () {
        var err = validateEmail(emailInput.value.trim());
        if (err) {
          setFieldError(emailWrap, err);
        } else {
          setFieldValid(emailWrap);
        }
      });
      emailInput.addEventListener('focus', function () {
        clearFieldValidation(emailWrap);
      });
      // Also validate on input after first blur (immediate feedback)
      emailInput.addEventListener('input', function () {
        if (emailWrap.classList.contains('has-error') || emailWrap.classList.contains('has-valid')) {
          var err = validateEmail(emailInput.value.trim());
          if (err) {
            setFieldError(emailWrap, err);
          } else {
            setFieldValid(emailWrap);
          }
        }
      });
    }
  }

  if (pwInput) {
    var pwWrap = pwInput.closest('.premium-input-wrap');
    if (pwWrap) {
      pwInput.addEventListener('blur', function () {
        var err = validatePassword(pwInput.value);
        if (err) {
          setFieldError(pwWrap, err);
        } else {
          setFieldValid(pwWrap);
        }
      });
      pwInput.addEventListener('focus', function () {
        clearFieldValidation(pwWrap);
      });
      pwInput.addEventListener('input', function () {
        if (pwWrap.classList.contains('has-error') || pwWrap.classList.contains('has-valid')) {
          var err = validatePassword(pwInput.value);
          if (err) {
            setFieldError(pwWrap, err);
          } else {
            setFieldValid(pwWrap);
          }
        }
      });
    }
  }

  if (roleSelect) {
    var roleWrap = roleSelect.closest('.premium-input-wrap');
    if (roleWrap) {
      roleSelect.addEventListener('blur', function () {
        // Role is always selected by default, so only flag if it's somehow empty
        if (!roleSelect.value) {
          setFieldError(roleWrap, 'Please select a role.');
        }
      });
      roleSelect.addEventListener('focus', function () {
        clearFieldValidation(roleWrap);
      });
    }
  }
}

function addBlurValidation(input, wrap, validatorFn) {
  if (!input || !wrap) return;
  input.addEventListener('blur', function () {
    var err = validatorFn(input.value.trim());
    if (err) { setFieldError(wrap, err); }
    else { setFieldValid(wrap); }
  });
  input.addEventListener('focus', function () { clearFieldValidation(wrap); });
  input.addEventListener('input', function () {
    if (wrap.classList.contains('has-error') || wrap.classList.contains('has-valid')) {
      var err = validatorFn(input.value.trim());
      if (err) { setFieldError(wrap, err); }
      else { setFieldValid(wrap); }
    }
  });
}

/* ─── Password Strength Meter ─── */

function evaluatePasswordStrength(value) {
  if (!value) return { score: 0, label: '', level: 0 };
  var score = 0;
  // Length bonus
  if (value.length >= 6) score += 1;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  // Character variety
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1; // mixed case
  if (/\d/.test(value)) score += 1;                              // has digit
  if (/[^a-zA-Z0-9]/.test(value)) score += 1;                    // has special char

  if (score <= 2) return { score: 1, label: 'Weak', level: 1 };
  if (score <= 4) return { score: 2, label: 'Medium', level: 2 };
  return { score: 3, label: 'Strong', level: 3 };
}

function updatePasswordStrength(pwInput) {
  var wrap = document.getElementById('pw-strength-wrap');
  var seg1 = document.getElementById('pw-seg-1');
  var seg2 = document.getElementById('pw-seg-2');
  var seg3 = document.getElementById('pw-seg-3');
  var label = document.getElementById('pw-strength-label');
  if (!wrap || !seg1) return;

  var value = pwInput.value;
  if (!value) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;

  var result = evaluatePasswordStrength(value);

  // Reset all
  seg1.className = 'pw-strength-segment';
  seg2.className = 'pw-strength-segment';
  seg3.className = 'pw-strength-segment';
  label.textContent = '';
  label.className = 'pw-strength-label';

  if (result.level >= 1) {
    seg1.classList.add('pw-weak');
    label.textContent = 'Weak';
    label.classList.add('pw-label-weak');
  }
  if (result.level >= 2) {
    seg2.classList.add('pw-medium');
    label.textContent = 'Medium';
    label.className = 'pw-strength-label pw-label-medium';
  }
  if (result.level >= 3) {
    seg3.classList.add('pw-strong');
    label.textContent = 'Strong';
    label.className = 'pw-strength-label pw-label-strong';
  }
}

function setupSignupFieldValidation() {
  var roleSelect = document.getElementById('signup-role');
  var roleWrap = roleSelect ? roleSelect.closest('.premium-input-wrap') : null;

  // Name
  var nameEl = document.getElementById('signup-name');
  addBlurValidation(nameEl, nameEl && nameEl.closest('.premium-input-wrap'), validateName);

  // Email
  var emailEl = document.getElementById('signup-email');
  addBlurValidation(emailEl, emailEl && emailEl.closest('.premium-input-wrap'), validateEmail);

  // Password — blur validation + live strength meter
  var pwEl = document.getElementById('signup-password');
  addBlurValidation(pwEl, pwEl && pwEl.closest('.premium-input-wrap'), validatePassword);
  if (pwEl) {
    pwEl.addEventListener('input', function () {
      updatePasswordStrength(pwEl);
    });
  }

  // Role
  if (roleWrap) {
    roleSelect.addEventListener('blur', function () {
      if (!roleSelect.value) setFieldError(roleWrap, 'Please select a role.');
    });
    roleSelect.addEventListener('focus', function () { clearFieldValidation(roleWrap); });
    // When role changes, clear/validate student extras accordingly
    roleSelect.addEventListener('change', function () {
      clearFieldValidation(roleWrap);
      var isStudent = roleSelect.value === 'Student';
      var studentExtra = document.getElementById('student-extra');
      if (studentExtra) {
        // Clear validation on student fields when hiding
        if (!isStudent) {
          ['signup-index','signup-department','signup-phone'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) clearFieldValidation(el.closest('.premium-input-wrap'));
          });
        }
      }
    });
  }

  // Student extra fields — only validate when visible
  var indexInput = document.getElementById('signup-index');
  var deptInput = document.getElementById('signup-department');
  var indexWrap = indexInput ? indexInput.closest('.premium-input-wrap') : null;
  var deptWrap = deptInput ? deptInput.closest('.premium-input-wrap') : null;

  function isStudentVisible() {
    var extra = document.getElementById('student-extra');
    return extra && extra.style.display !== 'none';
  }

  function addConditionalBlur(input, wrap, validatorFn) {
    if (!input || !wrap) return;
    input.addEventListener('blur', function () {
      if (!isStudentVisible()) { clearFieldValidation(wrap); return; }
      var err = validatorFn(input.value.trim());
      if (err) { setFieldError(wrap, err); }
      else { setFieldValid(wrap); }
    });
    input.addEventListener('focus', function () { clearFieldValidation(wrap); });
    input.addEventListener('input', function () {
      if (!isStudentVisible()) { clearFieldValidation(wrap); return; }
      if (wrap.classList.contains('has-error') || wrap.classList.contains('has-valid')) {
        var err = validatorFn(input.value.trim());
        if (err) { setFieldError(wrap, err); }
        else { setFieldValid(wrap); }
      }
    });
  }

  addConditionalBlur(indexInput, indexWrap, validateStudentId);
  addConditionalBlur(deptInput, deptWrap, validateDepartment);
}

/* ─── Forgot Password Modal ─── */

function setupForgotPasswordFlow() {
  var forgotLink = document.getElementById('forgot-link');
  var modal = document.getElementById('forgot-modal');
  var closeBtn = document.getElementById('forgot-close');
  var backLink = document.getElementById('forgot-back');
  var submitBtn = document.getElementById('forgot-submit');
  var emailInput = document.getElementById('forgot-email');
  var errorEl = document.getElementById('forgot-error');
  var defaultState = document.getElementById('forgot-default');
  var successState = document.getElementById('forgot-success');
  var sentEmail = document.getElementById('forgot-sent-email');
  var resendLink = document.getElementById('forgot-resend');
  var _submitting = false;

  if (!modal) return;

  function openModal() {
    modal.hidden = false;
    modal.style.display = 'flex';
    _submitting = false;
    // Reset to default state
    defaultState.hidden = false;
    successState.hidden = true;
    errorEl.hidden = true;
    if (emailInput) {
      emailInput.value = '';
      var wrap = emailInput.closest('.premium-input-wrap');
      if (wrap) clearFieldValidation(wrap);
      emailInput.focus();
    }
    setLoading(submitBtn, false);
  }

  function closeModal() {
    // Prevent closing while a request is in flight
    if (_submitting) return;
    modal.hidden = true;
    modal.style.display = '';
  }

  // Open on forgot link click
  if (forgotLink) {
    forgotLink.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
    });
  }

  // Close on X button
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // Close on overlay click
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Back to sign in link
  if (backLink) {
    backLink.addEventListener('click', function (e) {
      e.preventDefault();
      closeModal();
    });
  }

  // Submit handler
  if (submitBtn && emailInput) {
    function handleForgotSubmit() {
      // Guard against double-submit
      if (_submitting) return;

      var email = emailInput.value.trim();
      var err = validateEmail(email);
      var wrap = emailInput.closest('.premium-input-wrap');

      if (err) {
        if (wrap) setFieldError(wrap, err);
        showMessage(errorEl, err, 'error');
        return;
      }

      if (wrap) setFieldValid(wrap);
      errorEl.hidden = true;
      _submitting = true;
      setLoading(submitBtn, true);

      window.IaApi.apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: email },
      })
        .then(function () {
          _submitting = false;
          setLoading(submitBtn, false);
          // Show success state
          defaultState.hidden = true;
          successState.hidden = false;
          if (sentEmail) sentEmail.textContent = email;
          window.IaApi.showToast('Reset link sent! Check your email.', 'success');
        })
        .catch(function (error) {
          _submitting = false;
          setLoading(submitBtn, false);
          showMessage(errorEl, error.message || 'Failed to send reset email.', 'error');
          window.IaApi.showToast(error.message || 'Failed to send reset email.', 'error');
        });
    }

    submitBtn.addEventListener('click', handleForgotSubmit);

    // Submit on Enter key
    emailInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleForgotSubmit();
      }
    });

    // Real-time validation on blur
    emailInput.addEventListener('blur', function () {
      var wrap = emailInput.closest('.premium-input-wrap');
      var err = validateEmail(emailInput.value.trim());
      if (err) { if (wrap) setFieldError(wrap, err); }
      else if (wrap) { setFieldValid(wrap); }
    });
    emailInput.addEventListener('focus', function () {
      var wrap = emailInput.closest('.premium-input-wrap');
      if (wrap) clearFieldValidation(wrap);
      errorEl.hidden = true;
    });
  }

  // Resend / try again link
  if (resendLink) {
    resendLink.addEventListener('click', function (e) {
      e.preventDefault();
      // Reset to default state so user can re-enter email or resubmit
      _submitting = false;
      defaultState.hidden = false;
      successState.hidden = true;
      if (emailInput) {
        var wrap = emailInput.closest('.premium-input-wrap');
        if (wrap) clearFieldValidation(wrap);
        emailInput.focus();
      }
    });
  }
}

function setupPasswordToggle() {
  var toggle = document.getElementById('toggle-pw');
  if (!toggle) return;
  toggle.addEventListener('click', function () {
    var pwInput = document.getElementById('login-password');
    if (!pwInput) return;
    var isPassword = pwInput.type === 'password';
    pwInput.type = isPassword ? 'text' : 'password';
    // Toggle the eye icon
    toggle.innerHTML = isPassword
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  });
}

async function handleLogin(event) {
  event.preventDefault();
  var form = event.target;
  var messageEl = document.getElementById('auth-message');
  var submitBtn = form.querySelector('button[type="submit"]');

  var email = (form.querySelector('[name="email"]') || form.querySelector('[name="login-email"]'))?.value?.trim();
  var password = (form.querySelector('[name="password"]') || form.querySelector('[name="login-password"]'))?.value;
  var roleSelect = form.querySelector('[name="login-role"], [name="role"]');
  var roleLabel = roleSelect ? roleSelect.value : null;

  if (!email || !password) {
    showMessage(messageEl, 'Email and password are required.');
    // Highlight empty fields that were missed
    var emailEl = document.getElementById('login-email');
    var pwEl = document.getElementById('login-password');
    var emailW = emailEl ? emailEl.closest('.premium-input-wrap') : null;
    var pwW = pwEl ? pwEl.closest('.premium-input-wrap') : null;
    if (emailW && !email) setFieldError(emailW, 'Email is required.');
    if (pwW && !password) setFieldError(pwW, 'Password is required.');
    return;
  }

  setLoading(submitBtn, true);
  showMessage(messageEl, '');

  try {
    var data = await window.IaApi.apiFetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: email,
        password: password,
        roleLabel: roleLabel,
        role: roleLabel ? mapRoleLabel(roleLabel) : undefined,
      },
    });

    window.IaApi.setSession({
      idToken: data.idToken,
      user: data.user,
    });

    // Brief success flash, then redirect
    showMessage(messageEl, 'Login successful! Redirecting\u2026', 'success');
    window.IaApi.showToast('Login successful! Welcome back.', 'success', 2000);
    setTimeout(function () {
      window.location.href = '/dashboard';
    }, 800);
  } catch (error) {
    showMessage(messageEl, error.message || 'Login failed.');
    window.IaApi.showToast(error.message || 'Login failed. Please check your credentials.', 'error');
  } finally {
    setLoading(submitBtn, false);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  var form = event.target;
  var messageEl = document.getElementById('auth-message');
  var submitBtn = form.querySelector('button[type="submit"]');

  var roleLabel = form.querySelector('[name="signup-role"]')?.value || 'Student';
  var name = form.querySelector('[name="name"]')?.value?.trim()
    || form.querySelector('[name="signup-name"]')?.value?.trim();
  var email = form.querySelector('[name="email"]')?.value?.trim()
    || form.querySelector('[name="signup-email"]')?.value?.trim();
  var password = form.querySelector('[name="password"]')?.value
    || form.querySelector('[name="signup-password"]')?.value;

  if (!name || !email || !password) {
    showMessage(messageEl, 'Name, email, and password are required.');
    // Highlight empty fields
    function highlightEmpty(id) {
      var el = document.getElementById(id);
      var wrap = el ? el.closest('.premium-input-wrap') : null;
      if (wrap && !el.value.trim()) setFieldError(wrap, el.getAttribute('placeholder') || 'This field is required.');
    }
    highlightEmpty('signup-name');
    highlightEmpty('signup-email');
    highlightEmpty('signup-password');
    return;
  }

  var body = {
    name: name,
    email: email,
    password: password,
    roleLabel: roleLabel,
    role: mapRoleLabel(roleLabel),
  };

  if (body.role === 'student') {
    body.studentId = form.querySelector('[name="signup-index"]')?.value?.trim() || '';
    body.department = form.querySelector('[name="signup-department"]')?.value?.trim() || '';
    body.phone = form.querySelector('[name="signup-phone"]')?.value?.trim() || '';
    body.workplace = form.querySelector('[name="signup-company"]')?.value?.trim() || '';
    body.location = form.querySelector('[name="signup-location"]')?.value?.trim() || '';
  }

  setLoading(submitBtn, true);
  showMessage(messageEl, '');

  try {
    var data = await window.IaApi.apiFetch('/api/auth/register', {
      method: 'POST',
      body: body,
    });

    if (data.idToken) {
      window.IaApi.setSession({
        idToken: data.idToken,
        user: data.user,
      });
      window.location.href = '/dashboard';
      return;
    }

    window.IaApi.showToast('Account created successfully! Please log in.', 'success');
    showMessage(messageEl, 'Account created. Please log in.', 'success');
    var loginTab = document.querySelector('.tab[data-target="login"]');
    if (loginTab) loginTab.click();
  } catch (error) {
    window.IaApi.showToast(error.message || 'Signup failed.', 'error');
    showMessage(messageEl, error.message || 'Signup failed.');
  } finally {
    setLoading(submitBtn, false);
  }
}

function initAuthForms() {
  var loginForm = document.getElementById('login-form');
  var signupForm = document.getElementById('signup-form');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (signupForm) signupForm.addEventListener('submit', handleSignup);

  // Real-time field validation on blur
  setupFieldValidation();
  setupSignupFieldValidation();

  // Forgot password modal
  setupForgotPasswordFlow();

  // Password visibility toggle
  setupPasswordToggle();

  // If already authenticated, redirect to dashboard
  if (window.IaApi.getToken()) {
    window.IaApi.apiFetch('/api/auth/profile')
      .then(function () {
        if (loginForm || signupForm) {
          window.location.href = '/dashboard';
        }
      })
      .catch(function () { window.IaApi.clearSession(); });
  }
}

document.addEventListener('DOMContentLoaded', initAuthForms);

window.IaAuth = {
  mapRoleLabel: mapRoleLabel,
  handleLogin: handleLogin,
  handleSignup: handleSignup,
};
