const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME    || import.meta.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || import.meta.env.NEXT_PUBLIC_CLOUDINARY_GUEST_UPLOAD_PRESET;

export function uploadToCloudinary(file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
    const xhr = new XMLHttpRequest();
    const fd  = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    fd.append('folder', 'house_360_tours');

    xhr.open('POST', url, true);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded/e.total)*100)); };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const r = JSON.parse(xhr.responseText);
        resolve({ url: r.secure_url, public_id: r.public_id });
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try { const e = JSON.parse(xhr.responseText); if (e.error?.message) msg = e.error.message; } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(fd);
  });
}
