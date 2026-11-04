
const index = document.getElementById('manual-index');
const narrow = matchMedia('(max-width:800px)');
if (narrow.matches) index.open = false;
const chapters = Array.from(document.querySelectorAll('.page'));
const links = Array.from(index.querySelectorAll('a'));
function updateChapter() {
 let current = chapters[0];
 for (const chapter of chapters) {
  if (chapter.getBoundingClientRect().top > 90) break;
  current = chapter;
 }
 for (const link of links) {
  if (link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
  else link.removeAttribute('aria-current');
 }
}
index.addEventListener('click', event => {
 if (narrow.matches && event.target.closest('a')) index.open = false;
});
addEventListener('scroll', updateChapter, {passive:true});
addEventListener('hashchange', updateChapter);
updateChapter();

