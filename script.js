// engine.js - Modul Manajemen Status dan Struktur Narasi
const GameState = {
    currentNode: "scene_01_intro",
    playerData: {
        hackBattery: 100,
        empathyLevel: 0,
        unlockedSecrets: []
    },
    npcData: {
        rina_affinity: 0
    }
};

const NarrativeDatabase = {
    "scene_01_intro": {
        speaker: "Rina (Manajer Korporat)",
        dialogue: "Mataku terasa perih. Layar-layar di menara itu menyedot habis energiku. Kau punya sesuatu untuk... membuatku lupa?",
        sprite_state: "assets/rina_exhausted.png",
        choices: [
            {
                label: "Menyeduh Teh Bunga Telang (Afinitas +10)",
                targetNode: "scene_01_tea",
                mutator: () => { GameState.npcData.rina_affinity += 10; GameState.playerData.empathyLevel += 5; }
            },
            {
                label: "Menyarankan Intervensi Saraf Langsung [Biaya: 40 Baterai]",
                targetNode: "scene_01_hack_init",
                // Logika bersyarat: Opsi ini hanya muncul jika baterai mencukupi
                condition: () => GameState.playerData.hackBattery >= 40 
            }
        ]
    },
    "scene_01_tea": {
        speaker: "Rina",
        dialogue: "Warna biru teh ini... entah kenapa membuatku ingat masa kecilku sebelum neon-neon ini menelan segalanya. Terima kasih, Nadi.",
        choices: [
            { label: "Lanjutkan melayani pelanggan berikutnya...", targetNode: "scene_end_shift" }
        ]
    },
    "scene_01_hack_init": {
        speaker: "Sistem Eksekusi Saraf",
        dialogue: "MEMULAI URUTAN SINKRONISASI KOGNITIF. SIAPKAN ANTARMUKA PENGHINDARAN TRAUMA.",
        choices: [
            {
                label: "[MULAI PERETASAN]",
                targetNode: "hack_hub",
                mutator: () => { 
                    GameState.playerData.hackBattery -= 40; 
                    triggerCanvasMinigame("rina_trauma_node"); 
                }
            }
        ]
    }
};

// Referensi Node DOM Kritis
const uiSpeaker = document.getElementById('speakerName');
const uiDialogue = document.getElementById('dialogueContent');
const uiChoicesBox = document.getElementById('decisionMatrix');
const uiAffinity = document.getElementById('affinityScore');
const uiSprite = document.getElementById('npcSprite');
const narrativeContainer = document.getElementById('narrativeInterface');

function renderScene(nodeId) {
    const sceneData = NarrativeDatabase[nodeId];
    if (!sceneData) {
        console.error("Kesalahan Mesin: Node " + nodeId + " tidak ditemukan dalam basis data.");
        return;
    }

    // Pembaruan Informasi Teks Utama
    uiSpeaker.innerText = sceneData.speaker || "Sistem";
    uiDialogue.innerText = sceneData.dialogue;
    
    // Pembaruan Metrik Afinitas UI
    uiAffinity.innerText = GameState.npcData.rina_affinity;

    // Pembaruan Aset Visual Jika Didefinisikan
    if (sceneData.sprite_state) {
        uiSprite.src = sceneData.sprite_state;
    }

    // Pembersihan Matriks Pilihan Sebelumnya
    uiChoicesBox.innerHTML = '';

    // Iterasi Objek Pilihan Dinamis
    sceneData.choices.forEach(choice => {
        // Pengecekan Fungsi Kondisi Pra-Syarat
        if (choice.condition && choice.condition() === false) {
            return; // Lewati pembuatan tombol ini dari DOM
        }

        const btnElement = document.createElement('button');
        btnElement.className = 'decision-btn';
        btnElement.innerText = choice.label;
        
        // Pendaftaran Event Listener untuk Eksekusi Navigasi
        btnElement.addEventListener('click', () => {
            if (choice.mutator) {
                choice.mutator(); // Eksekusi fungsi pengubah status (state mutator)
            }
            if (choice.targetNode) {
                renderScene(choice.targetNode);
            }
        });

        uiChoicesBox.appendChild(btnElement);
    });
}

// Fase Eksekusi Inisial
window.addEventListener('DOMContentLoaded', () => {
    renderScene(GameState.currentNode);
});

// Referensi Konteks Render 2D
const canvasElement = document.getElementById('coreCanvas');
const ctx = canvasElement.getContext('2d');

let isCanvasActive = false;
let animationFrameId;

// Adaptasi Resolusi Berdasarkan Viewport (Liquid Layout)
function calibrateCanvasResolution() {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}
window.addEventListener('resize', calibrateCanvasResolution);
calibrateCanvasResolution();

// Spesifikasi Entitas Kinetik: Avatar Peretas
const hackerEntity = {
    x: canvasElement.width / 2,
    y: canvasElement.height - 120,
    width: 25,
    height: 25,
    color: 'var(--neon-cyan)',
    baseVelocity: 8,
    isInvulnerable: false
};

// Koleksi Data Objek Dinamis
let virusProjectiles = [];
let hackIntegrity = 0; // Skor Kemenangan
let systemDamage = 0; // Kondisi Kekalahan (Maks 3)

// Modul Deteksi Input Hibrida (Keyboard & Sentuhan Multititik)
const inputState = { left: false, right: false, up: false, down: false };

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') inputState.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') inputState.right = true;
    if (e.key === 'ArrowUp' || e.key === 'w') inputState.up = true;
    if (e.key === 'ArrowDown' || e.key === 's') inputState.down = true;
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') inputState.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') inputState.right = false;
    if (e.key === 'ArrowUp' || e.key === 'w') inputState.up = false;
    if (e.key === 'ArrowDown' || e.key === 's') inputState.down = false;
});

// Pendaftaran Pemrosesan Sentuhan untuk Gen Z yang Mobile-First
canvasElement.addEventListener('touchmove', (e) => {
    if (!isCanvasActive) return;
    e.preventDefault(); // Menghentikan laju gulir bawaan peramban
    const activeTouch = e.touches[0];
    // Interpolasi posisi avatar mengikuti koordinat sentuhan secara waktu nyata
    hackerEntity.x = activeTouch.clientX - (hackerEntity.width / 2);
    hackerEntity.y = activeTouch.clientY - (hackerEntity.height / 2);
}, { passive: false });

// Pabrik Pembuatan Prosedural Virus
function generateVirusProjectile() {
    virusProjectiles.push({
        x: Math.random() * (canvasElement.width - 30),
        y: -50,
        width: Math.random() * 20 + 20, // Variasi Ukuran Abstrak
        height: Math.random() * 20 + 20,
        color: Math.random() > 0.5 ? '#ff00ff' : '#fcee0a', // Magenta atau Yellow Error
        velocityY: 4 + Math.random() * 5,
        velocityX: (Math.random() - 0.5) * 2 // Proyeksi Lateral Ringan
    });
}

function computePhysicsEngine() {
    // Vektorisasi Pergerakan Input Tradisional
    if (inputState.left && hackerEntity.x > 0) hackerEntity.x -= hackerEntity.baseVelocity;
    if (inputState.right && hackerEntity.x + hackerEntity.width < canvasElement.width) hackerEntity.x += hackerEntity.baseVelocity;
    if (inputState.up && hackerEntity.y > 0) hackerEntity.y -= hackerEntity.baseVelocity;
    if (inputState.down && hackerEntity.y + hackerEntity.height < canvasElement.height) hackerEntity.y += hackerEntity.baseVelocity;

    // Kinematika Proyektil dan Evaluasi Algoritma AABB
    for (let i = virusProjectiles.length - 1; i >= 0; i--) {
        let virus = virusProjectiles[i];
        virus.y += virus.velocityY;
        virus.x += virus.velocityX;

        // Logika Batas Ruang AABB
        if (!hackerEntity.isInvulnerable &&
            hackerEntity.x < virus.x + virus.width &&
            hackerEntity.x + hackerEntity.width > virus.x &&
            hackerEntity.y < virus.y + virus.height &&
            hackerEntity.height + hackerEntity.y > virus.y) {
            
            // Reaksi Tabrakan: Kalkulasi Penalti Sistem
            systemDamage++;
            virusProjectiles.splice(i, 1); // Penghancuran proyektil pasca impak
            
            // Konsekuensi Kekalahan Berjenjang
            if (systemDamage >= 3) {
                terminateMinigame(false); // Pengembalian paksa ke antarmuka VN
                return;
            }
            continue;
        }

        // Peningkatan Metrik Kemenangan jika berhasil menghindar
        if (virus.y > canvasElement.height) {
            virusProjectiles.splice(i, 1);
            hackIntegrity += 5; // Poin Penyelarasan Memori
        }
    }

    // Variabel Probabilitas Penambahan Musuh Waktu Nyata
    if (Math.random() < 0.08) generateVirusProjectile();
    
    // Konsekuensi Kemenangan Naratif
    if (hackIntegrity >= 100) {
        terminateMinigame(true);
    }
}

// Prosedur Render Kanvas (Visual Output)
function renderGraphicsPipeline() {
    // Pengosongan Matriks Layar menggunakan Efek Pudar Transparan (Trail Effect)
    ctx.fillStyle = 'rgba(8, 8, 10, 0.3)';
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    // Proses Penggambaran Entitas Pemain (Avatar)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f3ff'; // Estetika Pendar Cahaya
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(hackerEntity.x, hackerEntity.y, hackerEntity.width, hackerEntity.height);

    // Iterasi Render Partikel Virus Musuh
    virusProjectiles.forEach(virus => {
        ctx.shadowBlur = 20;
        ctx.shadowColor = virus.color;
        ctx.fillStyle = virus.color;
        
        // Render Kompleksitas Geometris Kasar untuk mensimulasikan cacat digital (glitch)
        ctx.beginPath();
        ctx.moveTo(virus.x, virus.y);
        ctx.lineTo(virus.x + virus.width, virus.y + (virus.height/2));
        ctx.lineTo(virus.x + (virus.width/2), virus.y + virus.height);
        ctx.closePath();
        ctx.fill();
    });

    // Sub-Sistem Render Instrumen Head-Up Display (HUD)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Courier New"';
    ctx.fillText('Integritas Sinkronisasi: ' + hackIntegrity + '%', 20, 40);
    
    ctx.fillStyle = '#ff0055';
    ctx.fillText('Distorsi Sistem: ' + systemDamage + '/3', 20, 70);
}

// Rekursi Siklus Waktu Nyata
function executeCoreLoop() {
    if (!isCanvasActive) return;
    computePhysicsEngine();
    renderGraphicsPipeline();
    animationFrameId = requestAnimationFrame(executeCoreLoop);
}

// Pemantik Transisi Fase Sinkronisasi
function triggerCanvasMinigame(targetNarrativeNode) {
    // Sembunyikan Komponen VN dan Rebut Kontrol Layer
    narrativeContainer.classList.add('hide-on-action');
    
    // Reset Parameter Kondisi Awal
    hackIntegrity = 0;
    systemDamage = 0;
    virusProjectiles = [];
    hackerEntity.x = canvasElement.width / 2;
    hackerEntity.y = canvasElement.height - 120;
    
    isCanvasActive = true;
    executeCoreLoop(); // Memulai Mesin Fisika Kanvas
}

// Evaluasi Kesimpulan Fase Aksi
function terminateMinigame(victoryStatus) {
    isCanvasActive = false;
    cancelAnimationFrame(animationFrameId);
    
    // Menghapus Residu Render Grafis Terakhir
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Memulihkan Panel Antarmuka Kaca Visual Novel
    narrativeContainer.classList.remove('hide-on-action');

    // Integrasi Konsekuensi Bercabang ke Node Dialog Spesifik
    if (victoryStatus) {
        renderScene("hack_success_reveal_truth");
    } else {
        renderScene("hack_failure_overload");
    }
}

