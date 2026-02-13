"use strict";

const detectBtn = document.getElementById("detect-btn");
const imageInput = document.getElementById("plant-image");

const diseaseNameEl = document.getElementById("disease-name");
const diseaseConfidenceEl = document.getElementById("disease-confidence");
const diseaseAdviceEl = document.getElementById("disease-advice");

const soilMoistureEl = document.getElementById("soil-moisture");
const soilPhEl = document.getElementById("soil-ph");
const soilTempEl = document.getElementById("soil-temp");

const weatherTempEl = document.getElementById("weather-temp");
const weatherHumidityEl = document.getElementById("weather-humidity");
const weatherConditionEl = document.getElementById("weather-condition");

const advisoryMessageEl = document.getElementById("advisory-message");
const imagePreviewEl = document.getElementById("image-preview");
const previewTextEl = document.getElementById("preview-text");

const DUMMY_PREDICTION = {
  disease: "Leaf Blight",
  confidence: "93%",
  advice:
    "Apply a copper-based fungicide and water at the base of the plant to keep foliage dry.",
};

const DUMMY_WEATHER = {
  temperature: 27,
  humidity: 58,
  condition: "Partly Cloudy",
};

const DUMMY_SOIL = {
  moisture: 42,
  ph: 6.5,
  temperature: 24,
};

const DUMMY_ADVISORY = {
  message:
    "Field officers recommend scouting twice weekly and keeping irrigation in the morning to avoid leaf moisture overnight.",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const applySoil = (soil) => {
  soilMoistureEl.textContent = soil.moisture;
  soilPhEl.textContent = soil.ph;
  soilTempEl.textContent = soil.temperature;
};

const applyWeather = (weather) => {
  weatherTempEl.textContent = weather.temperature;
  weatherHumidityEl.textContent = weather.humidity;
  weatherConditionEl.textContent = weather.condition;
};

const predictDisease = async () => {
  if (!imageInput.files.length) {
    alert("Please choose an image before running detection.");
    return;
  }

  detectBtn.disabled = true;
  detectBtn.textContent = "Detecting...";

  try {
    await sleep(600);
    diseaseNameEl.textContent = DUMMY_PREDICTION.disease;
    diseaseConfidenceEl.textContent = DUMMY_PREDICTION.confidence;
    diseaseAdviceEl.textContent = DUMMY_PREDICTION.advice;
    applyWeather(DUMMY_WEATHER);
    applySoil(DUMMY_SOIL);
    advisoryMessageEl.textContent = DUMMY_ADVISORY.message;
  } finally {
    detectBtn.disabled = false;
    detectBtn.textContent = "Detect Disease";
  }
};

detectBtn.addEventListener("click", predictDisease);

let previewUrl;
const resetPreview = () => {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  imagePreviewEl.style.backgroundImage = "";
  imagePreviewEl.classList.remove("has-image");
  previewTextEl.textContent = "Supports JPG / PNG. File stays on your device.";
};

imageInput.addEventListener("change", () => {
  if (!imageInput.files.length) {
    resetPreview();
    return;
  }
  const file = imageInput.files[0];
  previewUrl = URL.createObjectURL(file);
  imagePreviewEl.style.backgroundImage = `linear-gradient(rgba(2,6,23,0.3), rgba(2,6,23,0.3)), url(${previewUrl})`;
  imagePreviewEl.classList.add("has-image");
  previewTextEl.textContent = file.name;
});
resetPreview();
advisoryMessageEl.textContent = "Upload a leaf photo to reveal insights.";

