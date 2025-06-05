function shareOn(network) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent('Check out print3!');
  let shareUrl = '';
  switch (network) {
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      break;
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
      break;
    case 'reddit':
      shareUrl = `https://www.reddit.com/submit?url=${url}&title=${text}`;
      break;
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/shareArticle?url=${url}&title=${text}`;
      break;
    case 'tiktok':
      shareUrl = `https://www.tiktok.com/upload?url=${url}`;
      break;
    case 'instagram':
      shareUrl = `https://www.instagram.com/?url=${url}`;
      break;
  }
  window.open(shareUrl, '_blank', 'noopener');
}

if (typeof module !== 'undefined') {
  module.exports = { shareOn };
}
export { shareOn };
