


self.addEventListener("install", e=>{
    e.waitUntil(caches.open("pwa-cache").then(cache=>{
        return cache.addAll(["index.html","manifest.json","icon-192.png","icon-512.png"]);
    }));
});
self.addEventListener("fetch", e=>{
    e.respondWith(caches.match(e.request).then(res=>res||fetch(e.request)));
});

function showTab(tab) {
    // Hide all tabs
    document.querySelectorAll(".tab").forEach(t => {
        t.classList.remove("show");
    });

    // Show the selected tab
    document.getElementById(tab).classList.add("show");

    // Update active button highlight
    document.getElementById("tabLookup").classList.toggle("active", tab === "lookup");
    document.getElementById("tabLeaderboard").classList.toggle("active", tab === "leaderboard");
}

if (tab === 'leaderboard') {
    loadLeaderboard('Nami'); // or remember last selected
}
