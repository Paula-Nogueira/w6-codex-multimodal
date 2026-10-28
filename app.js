const imageInput = document.querySelector("#image");
const sendButton = document.querySelector("#send");
const result = document.querySelector("#result");
const preview = document.querySelector("#preview");
const previewUrls = [];

imageInput.addEventListener("change", () => {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls.length = 0;
  preview.replaceChildren();

  const files = Array.from(imageInput.files);
  if (files.length > 2) {
    imageInput.value = "";
    preview.textContent = "No image selected";
    result.textContent = "Choose no more than 2 images.";
    return;
  }

  if (files.length === 0) {
    preview.textContent = "No image selected";
    result.replaceChildren();
    const message = document.createElement("p");
    message.textContent = "Waiting for input...";
    result.append(message);
    return;
  }

  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);
    const image = document.createElement("img");
    image.src = url;
    image.alt = `Preview of ${file.name}`;
    preview.append(image);
  });
  result.replaceChildren();
  const message = document.createElement("p");
  message.textContent = "Ready to describe the selected image(s).";
  result.append(message);
});

sendButton.addEventListener("click", async () => {
  const files = Array.from(imageInput.files);
  if (files.length === 0) {
    result.textContent = "Choose at least one image first.";
    return;
  }

  if (files.length > 2) {
    result.textContent = "Choose no more than 2 images.";
    return;
  }

  sendButton.disabled = true;
  result.replaceChildren();
  const descriptionElements = files.map((file, index) => {
    const card = document.createElement("article");
    card.className = "description-card";
    const heading = document.createElement("h3");
    heading.textContent = `Image ${index + 1}: ${file.name}`;
    const description = document.createElement("p");
    description.textContent = "Waiting for Ollama...";
    card.append(heading, description);
    result.append(card);
    return description;
  });

  try {
    for (const [index, file] of files.entries()) {
      try {
        descriptionElements[index].textContent = "Generating description...";
        const base64Image = await readImageAsBase64(file);
        const response = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemma3",
            prompt: "Describe this image.",
            images: [base64Image],
            stream: false
          })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Ollama error (${response.status}): ${errorBody || response.statusText}`);
        }

        const data = await response.json();
        if (typeof data.response !== "string" || !data.response.trim()) {
          throw new Error("Ollama returned no description.");
        }
        descriptionElements[index].textContent = data.response;
      } catch (error) {
        descriptionElements[index].textContent =
          error instanceof Error ? `Could not describe this image: ${error.message}` : "Could not describe this image.";
      }
    }
  } finally {
    sendButton.disabled = false;
  }
});

function readImageAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Could not read ${file.name}.`));
        return;
      }
      const base64Image = reader.result.split(",")[1];
      if (!base64Image) {
        reject(new Error(`Could not encode ${file.name}.`));
        return;
      }
      resolve(base64Image);
    };
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}