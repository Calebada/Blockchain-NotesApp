import React, { useState } from 'react';
import { PenSquare, Plus, Inbox, Star, Tag, Search, Trash2 } from 'lucide-react';
import { NOTE_TAG_OPTIONS } from '../types/note';
import type { NoteCounts } from '../types/note';

interface SidebarProps {
  activeTab: string;
  onTabSelect: (tab: string) => void;
  onNewNote: () => void;
  counts: NoteCounts;
}

export default function Sidebar({ activeTab, onTabSelect, onNewNote, counts }: SidebarProps) {
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  const fixedNav = NOTE_TAG_OPTIONS;
  const filteredFixedNav = fixedNav.filter(tag =>
    tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );
  const dynamicTags = Object.keys(counts.tags).filter(
    tag => !fixedNav.map(t => t.toLowerCase()).includes(tag.toLowerCase()) &&
           tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

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


      <nav className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1 }}>
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
        <NavItem
          icon={<Trash2 size={18} />}
          label="Trash"
          count={counts.trash}
          isActive={activeTab === 'trash'}
          onClick={() => onTabSelect('trash')}
        />

        <div style={{ 
          marginTop: '24px', 
          marginBottom: '8px', 
          padding: '0 12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', color: '#8A8581', textTransform: 'uppercase' }}>TAGS</span>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            backgroundColor: 'transparent',
            borderRadius: '4px',
            padding: '2px 6px',
            width: '100px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <Search size={12} color="#8A8581" />
            <input 
              type="text"
              placeholder="Search..."
              value={tagSearchQuery}
              onChange={(e) => setTagSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-sidebar)',
                fontSize: '11px',
                width: '100%'
              }}
            />
          </div>
        </div>

        {filteredFixedNav.map(navItem => (
          <NavItem
            key={navItem}
            icon={<Tag size={16} />}
            label={`#${navItem.toLowerCase()}`}
            count={counts.tags[navItem] || counts.tags[navItem.toLowerCase()] || 0}
            isActive={activeTab === navItem.toLowerCase()}
            onClick={() => onTabSelect(navItem.toLowerCase())}
          />
        ))}

        {dynamicTags.map(tag => (
          <NavItem
            key={tag}
            icon={<Tag size={16} />}
            label={`#${tag.toLowerCase()}`}
            count={counts.tags[tag] || 0}
            isActive={activeTab === tag.toLowerCase()}
            onClick={() => onTabSelect(tag.toLowerCase())}
          />
        ))}
        
        {tagSearchQuery && filteredFixedNav.length === 0 && dynamicTags.length === 0 && (
          <div style={{ padding: '8px 12px', fontSize: '12px', color: '#8A8581', fontStyle: 'italic' }}>
            No tags found.
          </div>
        )}
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
        <span style={{ color: isActive ? '#E39455' : 'inherit', display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
        <span style={{ color: isActive ? 'var(--text-sidebar-active)' : 'inherit' }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: '13px', opacity: 0.6 }}>{count}</span>
    </div>
  );
}
