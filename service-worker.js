self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('pwa-cache').then(cache => {
            return cache.addAll([
                './',
                './index.html',
                './style.css',
                './app.js',

                // иконки UI
                './icons/copy.png',
                './icons/delete.png',
                './icons/eye.png',
                './icons/eye_off.png',
                './icons/lock.png',

                // иконки из manifest.json
                './icons/key_192_192.png',
                './icons/key_512_512.png'
            ]);
        })
    );
});