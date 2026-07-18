import React from 'react';
import { PenSquare, Plus, Inbox, Star, Tag } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabSelect: (tab: string) => void;
  onNewNote: () => void;
  counts: {
    all: number;
    pinned: number;
    tags: Record<string, number>;
  };
}

export default function Sidebar({ activeTab, onTabSelect, onNewNote, counts }: SidebarProps) {
  const tags = ['General', 'Ideas', 'Personal', 'Work'];

  return (
    <div style={{
      width: '260px',
      height: '100vh',
      backgroundColor: 'var(--bg-sidebar)',
      color: 'var(--text-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      position: 'fixed',
      left: 0,
      top: 0
    }}>
      {/* Logo Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', padding: '0 8px' }}>
        <div style={{ 
          width: '36px', 
          height: '36px', 
          backgroundColor: 'var(--accent-orange)', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--bg-sidebar)'
        }}>
          <PenSquare size={20} />
        </div>
        <div>
          <h1 className="serif-title" style={{ color: 'white', fontSize: '20px', margin: 0, lineHeight: 1.2 }}>Notetify</h1>
          <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', color: '#8A8581' }}>THINKING, GATHERED</span>
        </div>
      </div>

      {/* New Note Button */}
      <button 
        onClick={onNewNote}
        style={{
          width: '100%',
          backgroundColor: 'var(--accent-orange)',
          color: 'var(--bg-sidebar)',
          border: 'none',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '8px',
          cursor: 'pointer',
          marginBottom: '24px',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-orange-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-orange)'}
      >
        <Plus size={18} />
        New note
      </button>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <NavItem 
          icon={<Inbox size={18} />} 
          label="All notes" 
          count={counts.all} 
          isActive={activeTab === 'all'} 
          onClick={() => onTabSelect('all')} 
        />
        <NavItem 
          icon={<Star size={18} />} 
          label="Pinned" 
          count={counts.pinned} 
          isActive={activeTab === 'pinned'} 
          onClick={() => onTabSelect('pinned')} 
        />
        
        <div style={{ marginTop: '24px', marginBottom: '8px', padding: '0 12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', color: '#8A8581', textTransform: 'uppercase' }}>TAGS</span>
        </div>
        
        {tags.map(tag => (
          <NavItem 
            key={tag}
            icon={<Tag size={16} />} 
            label={tag} 
            count={counts.tags[tag] || 0} 
            isActive={activeTab === tag.toLowerCase()} 
            onClick={() => onTabSelect(tag.toLowerCase())} 
          />
        ))}
      </nav>
    </div>
  );
}

function NavItem({ icon, label, count, isActive, onClick }: { icon: React.ReactNode, label: string, count: number, isActive: boolean, onClick: () => void }) {
  return (
    <div 
      className="sidebar-item"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
        color: isActive ? 'var(--text-sidebar-active)' : 'var(--text-sidebar)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: isActive ? 500 : 400 }}>
        {icon}
        {label}
      </div>
      <span style={{ fontSize: '13px', opacity: 0.6 }}>{count}</span>
    </div>
  );
}
