/**
 * Where project videos are served from.
 *
 * Videos (.mp4/.webm/.mov) under /assets/images/projects/ and /assets/video/ can live in
 * Firebase Storage instead of the repo, so re-recording a clip no longer grows git.
 * Records and code keep their usual /assets/... paths; this maps them at display time.
 *
 * Switch on (once `npm run upload-media` has uploaded every clip and the storage.rules
 * `media/` read rule is deployed): set MEDIA_FROM_STORAGE = true.
 * Posters (.webp) always stay in the repo.
 */
(function () {
  'use strict';

  var MEDIA_FROM_STORAGE = false;
  var BUCKET = 'portfolio-2578e.firebasestorage.app';
  var VIDEO_PATH = /^\/assets\/(images\/projects|video)\/[^?#]+\.(mp4|webm|mov)(?=$|[?#])/i;

  /** Storage object name for a repo path: /assets/video/x.mp4 → media/video/x.mp4 */
  function objectName(path) {
    return 'media/' + path.replace(/^\/assets\//, '');
  }

  /**
   * Same-origin path in, playable URL out. Anything that isn't a project video
   * (images, posters, full URLs) is returned unchanged. Keeps any ?v= cache-buster.
   */
  function mediaUrl(src) {
    var s = String(src || '');
    if (!MEDIA_FROM_STORAGE) return s;
    var m = s.match(VIDEO_PATH);
    if (!m) return s;
    var rest = s.slice(m[0].length);
    var v = (rest.match(/[?&]v=([^&#]*)/) || [])[1];
    return 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/' +
      encodeURIComponent(objectName(m[0])) + '?alt=media' + (v ? '&v=' + encodeURIComponent(v) : '');
  }

  var api = { mediaUrl: mediaUrl, objectName: objectName, VIDEO_PATH: VIDEO_PATH, BUCKET: BUCKET };
  if (typeof window !== 'undefined') window.cwrMediaUrl = mediaUrl;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
