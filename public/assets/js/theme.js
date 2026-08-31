(function(){
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
  window.Lotri = window.Lotri || {};
  window.Lotri.toggleTheme = function(){
    const cur = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    document.dispatchEvent(new CustomEvent('theme-changed', { detail: next }));
  };
  window.Lotri.themeIcon = function(){
    return document.documentElement.dataset.theme === 'dark'
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
  };

  // Otokable bouton tèm nan sou paj piblik yo (#theme-btn)
  document.addEventListener('DOMContentLoaded', function(){
    var b = document.getElementById('theme-btn');
    if (!b || b.dataset.wired) return;
    b.dataset.wired = '1';
    var paint = function(){ b.innerHTML = window.Lotri.themeIcon(); };
    b.addEventListener('click', function(){ window.Lotri.toggleTheme(); paint(); });
    paint();
  });
})();
