// Each UI owns its display mode, palette and artwork.
window.RPThemeCatalog = Object.freeze([
    {
        id: 'classic', name: '经典 · 2.8.118', subtitle: '原版布局', category: '常驻',
        mode: 'day', modeLabel: '经典', accent: '#6366f1', skin: 'classic',
        assets: 'assets/images/chenyue/', layout: 'classic',
        preview: { background: '#f9fafb', accent: '#6366f1' }
    },
    {
        id: 'journal', name: '白昼手账', subtitle: '纸页、月夹与轻盈玻璃', category: '常驻',
        mode: 'day', modeLabel: '日间', accent: '#8e4e60', skin: 'chenyue', assets: 'assets/images/chenyue/',
        preview: { background: '#f4f1f7', accent: '#8e4e60', image: 'assets/images/chenyue/welcome.webp' }
    },
    {
        id: 'vampire', name: '夜蔷薇', subtitle: '银月、酒红与玥玥的夜晚', category: '常驻',
        mode: 'night', modeLabel: '夜间', accent: '#e7acbb', skin: 'vampire', assets: 'assets/themes/vampire/',
        css: 'assets/themes/vampire/theme.css',
        preview: { background: '#21191f', accent: '#e7acbb', image: 'assets/themes/vampire/welcome.webp' }
    }
]);
