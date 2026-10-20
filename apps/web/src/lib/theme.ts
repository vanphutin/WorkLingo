export const THEME_STORAGE_KEY = 'worklingo:theme:v1';
export const TRANSPARENCY_STORAGE_KEY = 'worklingo:reduce-transparency:v1';

// Static code only; runs before paint. No user data is interpolated.
export const themeInitScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}try{if(localStorage.getItem('${TRANSPARENCY_STORAGE_KEY}')==='reduce')document.documentElement.dataset.reduceTransparency='true';}catch(e){}`;
