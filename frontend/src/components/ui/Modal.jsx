import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ title, onClose, children, width = 520 }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'rgba(0,0,0,0.6)', animation:'fadeIn .2s ease' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'var(--bc)', borderRadius:20, border:'1px solid var(--bd)', width:`min(${width}px,95vw)`, maxHeight:'88vh', overflowY:'auto', boxShadow:'0 32px 80px rgba(0,0,0,0.5)', animation:'fadeUp .2s ease' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid var(--bd)', position:'sticky', top:0, background:'var(--bc)', borderRadius:'20px 20px 0 0', zIndex:1 }}>
          <span style={{ fontSize:16, fontWeight:700, color:'var(--tx)' }}>{title}</span>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--bd)', background:'var(--b2)', color:'var(--t2)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ padding:'20px 24px' }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function ConfirmModal({ title, message, confirmLabel, confirmStyle='d', onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'rgba(0,0,0,0.6)', animation:'fadeIn .2s ease' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'var(--bc)', borderRadius:18, border:'1px solid var(--bd)', maxWidth:420, width:'90%', padding:'28px 24px', boxShadow:'0 32px 80px rgba(0,0,0,0.5)', animation:'fadeUp .2s ease' }}>
        <div style={{ fontSize:17, fontWeight:800, color:'var(--tx)', marginBottom:10 }}>{title}</div>
        <div style={{ fontSize:13.5, color:'var(--t3)', lineHeight:1.6, marginBottom:24 }}>{message}</div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-s" onClick={onCancel}>Cancel</button>
          <button className={`btn btn-${confirmStyle}`} onClick={onConfirm}>{confirmLabel||'Confirm'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
