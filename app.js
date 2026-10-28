const imageInput = document.querySelector("#image");
const sendButton = document.querySelector("#send");
const result = document.querySelector("#result");
const preview = document.querySelector("#preview");
const previewImage = document.querySelector("#preview-image");

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;

  previewImage.src = URL.createObjectURL(file);
  previewImage.hidden = false;
  preview.querySelector("span").hidden = true;
});

sendButton.addEventListener("click", async () => {
  const file = imageInput.files[0];
  if (!file) {
    result.textContent = "Choose an image first.";
    return;
  }

  sendButton.disabled = true;
  result.textContent = "Waiting for Ollama...";

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Could not read the selected image."));
          return;
        }
        resolve(reader.result);
      };
      reader.onerror = () => reject(reader.error || new Error("Could not read the selected image."));
      reader.readAsDataURL(file);
    });

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3",
        prompt: "Give me a JSON formatted list with the most important features of this image, and their confidence values.",
        images: [dataUrl.split(",")[1]],
        stream: false
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama error (${response.status}): ${errorBody || response.statusText}`);
    }

    const data = await response.json();
    result.textContent = data.response;
  } catch (error) {
    result.textContent = error instanceof Error ? error.message : "Request failed.";
  } finally {
    sendButton.disabled = false;
  }
});