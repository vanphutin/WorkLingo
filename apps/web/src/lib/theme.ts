export const THEME_STORAGE_KEY = 'worklingo:theme:v1';

// Static code only; runs before paint. No user data is interpolated.
export const themeInitScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}`;
