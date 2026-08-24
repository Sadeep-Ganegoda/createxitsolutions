const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const username = document.getElementById("username");
const result = document.getElementById("result");

navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false})
  .then(s => video.srcObject = s)
  .catch(e => result.textContent = "Camera error: " + e.message);

function capture() {
  return new Promise((resolve, reject) => {
    if (!video.videoWidth) return reject(new Error("Camera not ready."));
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 720;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, (video.videoWidth-size)/2, (video.videoHeight-size)/2, size, size, 0, 0, 720, 720);
    canvas.toBlob(b => b ? resolve(b) : reject(new Error("Capture failed.")), "image/jpeg", .9);
  });
}

async function callApi(url) {
  if (!username.value.trim()) throw new Error("Enter username.");
  const blob = await capture();
  const form = new FormData();
  form.append("username", username.value.trim());
  form.append("image", blob, "face.jpg");
  const r = await fetch(url, {method:"POST", body:form});
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed.");
  return data;
}

document.getElementById("register").onclick = async () => {
  try {
    result.textContent = "Registering...";
    const d = await callApi("/api/register");
    result.textContent = d.message;
  } catch(e) { result.textContent = e.message; }
};

document.getElementById("login").onclick = async () => {
  try {
    result.textContent = "Verifying...";
    const d = await callApi("/api/login");
    result.textContent = `${d.message} Confidence: ${Math.round((d.confidence||0)*100)}%`;
  } catch(e) { result.textContent = e.message; }
};
