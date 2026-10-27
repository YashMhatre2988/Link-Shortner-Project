import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createUrl, fetchUrls, clearCreated, clearError } from './features/urls/urlsSlice';

const prettyDate = value => new Date(value).toLocaleString();

export default function App() {
  const dispatch = useDispatch();
  const { items, status, creating, error, created } = useSelector(state => state.urls);
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { dispatch(fetchUrls()); }, [dispatch]);

  async function submit(event) {
    event.preventDefault();
    dispatch(clearError());
    const result = await dispatch(createUrl({
      originalUrl: originalUrl.trim(),
      customAlias: customAlias.trim() || null
    }));
    if (createUrl.fulfilled.match(result)) {
      setOriginalUrl('');
      setCustomAlias('');
    }
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('Copy this short URL:', text);
    }
  }

  return (
    <main className="page-shell">
      <nav className="topbar">
        <a className="brand" href="/" aria-label="LinkLite home"><span className="brand-icon">↗</span> liK</a>
        <span className="top-label"><span className="status-dot" /> SIMPLE LINK MANAGEMENT</span>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span /> SHORT LINKS. BIG POSSIBILITIES.</div>
        <h1>Make every link<br /><em>go further.</em></h1>
        <p className="hero-copy">Long URL? No problem. Create a clean, shareable link in seconds and keep track of every click.</p>

        <form className="shorten-card" onSubmit={submit}>
          <label htmlFor="originalUrl">Your destination URL</label>
          <div className="input-wrap">
            <span className="input-icon">↗</span>
            <input id="originalUrl" type="url" placeholder="https://example.com/your/very/long/link"
              value={originalUrl} onChange={e => setOriginalUrl(e.target.value)} required maxLength={2048} />
          </div>
          <label htmlFor="customAlias" className="alias-label">Custom alias <span>OPTIONAL</span></label>
          <div className="alias-wrap">
            <span className="alias-prefix">lik/</span>
            <input id="customAlias" type="text" placeholder="your-name" value={customAlias}
              onChange={e => setCustomAlias(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              minLength={3} maxLength={32} pattern="[a-zA-Z0-9_-]{3,32}" title="3–32 letters, numbers, hyphens or underscores" />
          </div>
          <button className="primary-button" type="submit" disabled={creating}>
            {creating ? 'Creating your link…' : 'Shorten URL'} <span>→</span>
          </button>
          <p className="form-footnote"> Free to use. No account required.</p>
        </form>

        {error && <div className="alert error" role="alert">{error}</div>}
        {created && <div className="created-card">
          <div><span className="success-mark">✓</span><div><strong>Your short link is ready</strong><a href={created.shortUrl} target="_blank" rel="noreferrer">{created.shortUrl}</a></div></div>
          <button className="copy-button" onClick={() => copy(created.shortUrl)}>{copied ? 'Copied ✓' : 'Copy link'}</button>
          <button className="dismiss" aria-label="Dismiss" onClick={() => dispatch(clearCreated())}>×</button>
        </div>}
      </section>

      <section className="links-section">
        <div className="section-heading">
          <div><div className="eyebrow">YOUR WORKSPACE</div><h2>Recent links <span className="count">{items.length}</span></h2></div>
          <button className="refresh-button" onClick={() => dispatch(fetchUrls())} title="Refresh links">↻ Refresh</button>
        </div>

        <div className="links-table">
          <div className="table-head"><span>SHORT LINK</span><span>DESTINATION</span><span>CLICKS</span><span>CREATED</span><span /></div>
          {status === 'loading' && items.length === 0 && <div className="empty-state">Loading your links…</div>}
          {status === 'failed' && items.length === 0 && <div className="empty-state">Could not load links. Check that the API and database are running.</div>}
          {status !== 'loading' && items.length === 0 && status !== 'failed' && <div className="empty-state"><span className="empty-icon">↗</span><strong>No links yet</strong><span>Your shortened URLs will show up here.</span></div>}
          {items.map(item => (
            <div className="table-row" key={item.id}>
              <div className="short-cell"><span className="link-symbol">↗</span><a href={item.shortUrl} target="_blank" rel="noreferrer">{item.code}</a></div>
              <a className="destination" href={item.originalUrl} target="_blank" rel="noreferrer" title={item.originalUrl}>{item.originalUrl}</a>
              <span className="clicks">{item.clickCount}</span>
              <span className="date">{prettyDate(item.createdAtUtc)}</span>
              <button className="row-copy" onClick={() => copy(item.shortUrl)} aria-label={`Copy ${item.code}`} title="Copy short URL">▢</button>
            </div>
          ))}
        </div>
        <p className="table-note">Showing the latest 100 links stored by this service.</p>
      </section>

      <footer><a className="brand footer-brand" href="/"><span className="brand-icon">↗</span> lik</a><span>Less link. More impact.</span><span>Built with React · ASP.NET Core · MySQL</span></footer>
    </main>
  );
}
