(() => {
  if (document.querySelector('.mobile-top-logo')) return;
  const logo = document.createElement('img');
  logo.className = 'mobile-top-logo';
  logo.src = 'assets/top-sports-logo.svg';
  logo.alt = 'Top Sports Fitness';
  document.body.append(logo);
})();