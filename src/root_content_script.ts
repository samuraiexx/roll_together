function updateLinks(roomId: string) {
  const links = document.querySelectorAll(
    ".collection-carousel-media-link .link.block-link"
  );

  links.forEach((block: HTMLAnchorElement) => {
    const blockUrl = new URL(block.href);
    const blockParams = new URLSearchParams(blockUrl.search);

    if (blockParams.get("rollTogetherRoom")) return;

    block.href = `${block.href}?rollTogetherRoom=${roomId}`;
  });
}

function observeCarousel(roomId: string) {
  const carousel = document.querySelector(".collection-carousel-scrollable");
  if (!carousel) return;

  let inInterval = false;
  const observer = new MutationObserver(() => {
    if (inInterval) return;

    updateLinks(roomId);
    setTimeout(() => {
      inInterval = false;
    }, 500);

    inInterval = true;
  });

  observer.observe(carousel, {
    attributes: true,
  });
}

function addSessionToLinks() {
  const url = new URL(document.URL);
  const params = new URLSearchParams(url.search);

  const roomId = params.get("rollTogetherRoom");

  if (!roomId) return;

  updateLinks(roomId);
  observeCarousel(roomId);
}

addSessionToLinks();
