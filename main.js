document.getElementById('clearChatBtn').addEventListener('click', function() {
  if (confirm("Are you sure you want to clear the chat history?")) {
    localStorage.removeItem('iyunai_chat');
    location.reload();
  }
});  

  const input = document.getElementById("user-input");
  const chat = document.getElementById("chat");
  const sendBtn = document.querySelector(".input-area button");

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  
  let chatHistory = [];

  window.addEventListener('DOMContentLoaded', function() {
  const saved = localStorage.getItem('iyunai_chat');
  if (saved) {
    chatHistory = JSON.parse(saved);
    chatHistory.forEach(msg => appendMessage(msg.text, msg.sender, false, false)); // Don't save again!
    setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
    }, 100);
  }
});

function appendMessage(text, sender, isPlaceholder = false, saveToHistory = true) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', sender);
  if (isPlaceholder) messageDiv.classList.add('placeholder');

  if (sender === 'bot') {
  messageDiv.innerHTML = `<span class="bot-text"></span>
    <button class="play-audio-btn" title="Play response">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#2563eb"/>
        <path d="M16.5 12c0-1.77-1-3.29-2.5-4.03v8.06A4.978 4.978 0 0 0 16.5 12z" fill="#2563eb"/>
        <path d="M14 3.23v2.06c3.39.49 6 3.39 6 6.71s-2.61 6.22-6 6.71v2.06c4.01-.52 7-3.87 7-8.77s-2.99-8.25-7-8.77z" fill="#2563eb"/>
      </svg>
    </button>`;
  // Use marked.parse to render Markdown
  messageDiv.querySelector('.bot-text').innerHTML = marked.parse(text);
} else {
  messageDiv.textContent = text;
}

  chat.appendChild(messageDiv);
  chat.scrollTop = chat.scrollHeight;

  // Save to chatHistory and localStorage (except for placeholders and when restoring)
  if (!isPlaceholder && saveToHistory) {
    chatHistory.push({ text, sender });
    localStorage.setItem('iyunai_chat', JSON.stringify(chatHistory));
  }

  return isPlaceholder ? messageDiv : null;
}

  function removeMarkdownBold(text) {
    // Remove all double asterisks used for bold in Markdown
    return text.replace(/\*\*/g, '');
  }

  function updateMessage(messageElement, newText) {
    if (messageElement && messageElement instanceof HTMLElement) {
      // If bot message, update only the text span
      const outputLang = document.getElementById('outputLang').value;
    // Only clean bold if output is not English
      const cleanedText = outputLang === 'en' ? newText : removeMarkdownBold(newText);

      const botText = messageElement.querySelector('.bot-text');
      if (botText) {
        botText.innerHTML = marked.parse(cleanedText);
      } else {
        messageElement.innerHTML = marked.parse(cleanedText);
      }
      messageElement.classList.remove('placeholder');
    }
  }

  async function sendMessage() {
      const userInput = input.value.trim();
      if (!userInput) return;
      input.value = '';
    
      const inputSelectedLang = document.getElementById('inputLang').value;
      const outputSelectedLang = document.getElementById('outputLang').value;
    
      appendMessage(userInput, 'user');
      const placeholderId = appendMessage("Processing...", 'bot', true);
    
      try {
        const response = await fetch("https://iyunai.azurewebsites.net/chat", {
        //   const response = await fetch("http://127.0.0.1:5000/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userInput, inputLanguage: inputSelectedLang, outputLanguage:  outputSelectedLang}),
        });
    
        const data = await response.json();
        const reply = data.reply || "Sorry, no reply received.";
    
        // try {
        //   const translationResponse = await fetch("https://iyun-ai-translate.onrender.com/translate", {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     body: JSON.stringify({ text: reply, to: "brx" })  // You may update "brx" based on selectedLang too
        //   });
    
        //   const translationData = await translationResponse.json();
        //   const translatedText = translationData.translation || reply;
        //   updateMessage(placeholderId, translatedText);
        // } catch (translationError) {
        //   console.error("Translation failed:", translationError);
        //   updateMessage(placeholderId, reply);
        // }
        
        updateMessage(placeholderId, reply);
        chatHistory.push({ text: reply, sender: 'bot' });
        localStorage.setItem('iyunai_chat', JSON.stringify(chatHistory));
    
      } catch (error) {
        updateMessage(placeholderId, "Sorry, something went wrong.");
        chatHistory.push({ text: reply, sender: 'bot' });
        localStorage.setItem('iyunai_chat', JSON.stringify(chatHistory));
      }
    
      input.value = '';
    }

    let currentAudio = null;
let currentAudioBtn = null;

document.getElementById('chat').addEventListener('click', async function(event) {
  if (event.target.closest('.play-audio-btn')) {
    const btn = event.target.closest('.play-audio-btn');
    const audiolang = document.getElementById('outputLang').value;

    if (audiolang !== "brx2") {
      alert("Voice is supported only for Bodo (Devanagiri) output.");
      return;
    }

    if (currentAudio && currentAudioBtn === btn) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
      btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
      btn.title = "Play response";
      currentAudioBtn = null;
      return;
    }

    const botTextElem = btn.parentElement.querySelector('.bot-text');
    if (!botTextElem) return;
    const text = botTextElem.textContent || botTextElem.innerText;
    const lang = document.getElementById('outputLang').value;
    const voiceModel = document.getElementById('voiceModel').value;

    if (!btn.dataset.originalHtml) {
      btn.dataset.originalHtml = btn.innerHTML;
    }

    btn.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 50 50">
        <circle class="path" cx="25" cy="25" r="20" fill="none" stroke="#2563eb" stroke-width="5"></circle>
      </svg>
    `;
    btn.disabled = true;
    btn.title = "Loading audio...";

    try {
      const response = await fetch('https://iyunai.azurewebsites.net/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang, voiceModel })
      });

      if (response.status === 429) {
        btn.innerHTML = btn.dataset.originalHtml;
        btn.title = "Quota exceeded";
        btn.disabled = false;
        alert("Voice quota exceeded!");
        return;
      }

      if (!response.ok) throw new Error('Audio fetch failed');
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      currentAudio = audio;
      currentAudioBtn = btn;

      btn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="#e53935"/>
        </svg>
      `;
      btn.disabled = false;
      btn.title = "Stop audio";

      audio.play();

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        btn.innerHTML = btn.dataset.originalHtml;
        btn.title = "Play response";
        currentAudio = null;
        currentAudioBtn = null;
      };

      audio.onpause = () => {
        URL.revokeObjectURL(audioUrl);
        btn.innerHTML = btn.dataset.originalHtml;
        btn.title = "Play response";
        currentAudio = null;
        currentAudioBtn = null;
      };
    } catch (e) {
      btn.innerHTML = btn.dataset.originalHtml;
      btn.title = "Audio unavailable";
      btn.disabled = false;
      currentAudio = null;
      currentAudioBtn = null;
    }
  }
});


    particlesJS("particles-js", {
      particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: "#90e0ef" },
        shape: {
          type: "circle",
          stroke: { width: 0, color: "#000000" },
          polygon: { nb_sides: 5 },
        },
        opacity: {
          value: 0.5,
          random: false,
          anim: { enable: false, speed: 1, opacity_min: 0.1, sync: false }
        },
        size: {
          value: 3,
          random: true,
          anim: { enable: false, speed: 40, size_min: 0.1, sync: false }
        },
        line_linked: {
          enable: true,
          distance: 150,
          color: "#90e0ef",
          opacity: 0.4,
          width: 1
        },
        move: {
          enable: true,
          speed: 4,
          direction: "none",
          random: false,
          straight: false,
          out_mode: "out",
          bounce: false,
          attract: { enable: false, rotateX: 600, rotateY: 1200 }
        }
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: { enable: true, mode: "repulse" },
          onclick: { enable: true, mode: "push" },
          resize: true
        },
        modes: {
          grab: { distance: 400, line_linked: { opacity: 1 } },
          bubble: { distance: 400, size: 40, duration: 2, opacity: 8, speed: 3 },
          repulse: { distance: 100, duration: 0.4 },
          push: { particles_nb: 4 },
          remove: { particles_nb: 2 }
        }
      },
      retina_detect: true
    });

  
  
  // info sidebar 

  const menuToggle = document.getElementById('menuToggle');
  const menuSidebar = document.getElementById('menuSidebar');

  menuToggle.addEventListener('click', function() {
    menuSidebar.classList.toggle('open');
  });

  // Optional: Close sidebar if user clicks outside
  document.addEventListener('click', function(event) {
    if (
      !menuSidebar.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      menuSidebar.classList.remove('open');
    }
  });
  
  const infoToggle = document.getElementById('infoToggle');
const infoSidebar = document.getElementById('infoSidebar');

infoToggle.addEventListener('click', function() {
  infoSidebar.classList.toggle('open');
});

// Optional: Close info sidebar if user clicks outside
document.addEventListener('click', function(event) {
  if (
    !infoSidebar.contains(event.target) &&
    !infoToggle.contains(event.target)
  ) {
    infoSidebar.classList.remove('open');
  }
});

  // Map language codes to placeholder text
  const placeholders = {
    en: "Ask anything...",
    brx1: "Maba swng...",
    brx2: "माबा सों ..."
  };

  // Get references to the select and input elements
  const inputLang = document.getElementById('inputLang');
  const userInput = document.getElementById('user-input');

  // Update placeholder on language change
  inputLang.addEventListener('change', function() {
    const selectedLang = inputLang.value;
    userInput.placeholder = placeholders[selectedLang] || "Ask anything...";
  });

  // Optional: Set initial placeholder based on default selected value
  userInput.placeholder = placeholders[inputLang.value] || "Ask anything.";

//     // Automatically open floating menu on first load/refresh
//   window.addEventListener('DOMContentLoaded', function() {
//     // Simulate a click to open the menu sidebar
//     menuToggle.click();
//   });