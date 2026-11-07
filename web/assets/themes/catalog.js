// Each skin owns one layout with paired day/night appearances.
window.RPThemeCatalog = Object.freeze([
    {
        id: 'classic', name: '经典皮肤', subtitle: '原版布局', category: '常驻', layout: 'classic',
        variants: {
            day: { skin: 'classic', assets: 'assets/images/chenyue/', navigation: 'assets/images/navigation/',
                preview: { background: '#f9fafb', accent: '#6366f1' } },
            night: { skin: 'classic', assets: 'assets/images/chenyue/', navigation: 'assets/images/navigation/', transfer: 'assets/themes/vampire/transfer.webp',
                preview: { background: '#16161a', accent: '#818cf8' } }
        }
    },
    {
        id: 'chenyue', name: '玥玥经典皮肤', subtitle: '白昼手账 · 夜蔷薇', category: '常驻', layout: 'modern',
        variants: {
            day: { skin: 'chenyue', assets: 'assets/images/chenyue/', navigation: 'assets/images/navigation/',
                preview: { background: '#f4f1f7', accent: '#8e4e60', image: 'assets/images/chenyue/welcome.webp' } },
            night: { skin: 'vampire', assets: 'assets/themes/vampire/', navigation: 'assets/themes/vampire/nav-', navigationNightArt: true, css: 'assets/themes/vampire/theme.css',
                preview: { background: '#21191f', accent: '#e7acbb', image: 'assets/themes/vampire/welcome.webp' } }
        }
    },
    {
        id: 'winter', name: '冬至皮肤', subtitle: '玥玥 · 冬至小暖屋', category: '季节', layout: 'modern',
        variants: {
            day: {
                skin: 'winter', assets: 'assets/themes/winter/assets/webp/mascots/',
                navigation: 'assets/images/navigation/', css: 'assets/themes/winter/theme.css',
                overrides: {
                    'title-label': 'assets/themes/winter/assets/webp/ui/title-label.webp',
                    'button-paper': 'assets/themes/winter/assets/webp/ui/dialog-panel.webp',
                    'album-corner-moon': 'assets/themes/winter/assets/webp/ui/album-corner-moon.webp',
                    'album-corner-leaf': 'assets/themes/winter/assets/webp/ui/album-corner-leaf.webp',
                    close: 'assets/themes/winter/assets/webp/ui/close.webp'
                },
                preview: { background: '#edf2f2', accent: '#963d49', image: 'assets/themes/winter/assets/webp/mascots/welcome.webp' }
            },
            night: {
                skin: 'winter', assets: 'assets/themes/winter/assets/webp/mascots/',
                navigation: 'assets/images/navigation/', css: 'assets/themes/winter/theme.css',
                overrides: {
                    'title-label': 'assets/themes/winter/assets/webp/ui/title-label-night.webp',
                    'button-paper': 'assets/themes/winter/assets/webp/ui/dialog-panel-night.webp',
                    'album-corner-moon': 'assets/themes/winter/assets/webp/ui/album-corner-moon-night.webp',
                    'album-corner-leaf': 'assets/themes/winter/assets/webp/ui/album-corner-leaf-night.webp',
                    close: 'assets/themes/winter/assets/webp/ui/close-night.webp'
                },
                preview: { background: '#252a2c', accent: '#f0a7ac', image: 'assets/themes/winter/assets/webp/mascots/welcome.webp' }
            }
        }
    }
]);
