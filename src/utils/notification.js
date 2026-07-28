/**
 * Toast Notifications & Confirmation Modal Utilities
 */

export function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }

  const bgClass = type === 'success' ? 'bg-success text-white' :
                  type === 'danger' ? 'bg-danger text-white' :
                  type === 'warning' ? 'bg-warning text-dark' : 'bg-dark text-white';

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center ${bgClass} border-0 shadow`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body small fw-medium">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  toastContainer.appendChild(toastEl);
  
  if (window.bootstrap && window.bootstrap.Toast) {
    const bsToast = new window.bootstrap.Toast(toastEl, { delay: 3500 });
    bsToast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  } else {
    setTimeout(() => toastEl.remove(), 3500);
  }
}

export function confirmDialog(title, message) {
  return new Promise((resolve) => {
    const modalHtml = `
      <div class="modal fade" id="confirmModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content bg-dark text-white border-secondary">
            <div class="modal-header border-secondary py-2">
              <h6 class="modal-title fw-bold">${title}</h6>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body small">
              ${message}
            </div>
            <div class="modal-footer border-secondary py-2">
              <button type="button" class="btn btn-sm btn-outline-light" id="btn-confirm-cancel" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-sm btn-danger" id="btn-confirm-ok">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const existingModal = document.getElementById('confirmModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('confirmModal');
    const bsModal = new window.bootstrap.Modal(modalEl);

    document.getElementById('btn-confirm-ok').addEventListener('click', () => {
      bsModal.hide();
      resolve(true);
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      modalEl.remove();
      resolve(false);
    });

    bsModal.show();
  });
}
