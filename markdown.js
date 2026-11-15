function renderMarkdown(md) {
  const html = marked.parse(md || '', { breaks: true });
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe', 'video', 'source'],
    ADD_ATTR: ['allowfullscreen', 'allow', 'frameborder', 'controls', 'loading']
  });
}