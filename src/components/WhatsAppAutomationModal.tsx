import React, { useState } from 'react';
import { Send, Phone, User, Check, CheckCheck, ExternalLink, Plus, MessageSquare, AlertCircle } from 'lucide-react';
import { Contact } from '../types/jarvis';
import { jarvisAudio } from '../utils/audioFx';
import {
  getAndroidBackgroundStatus,
  requestAccessibilityAutoSendPermission,
} from '../utils/androidBridge';

interface WhatsAppAutomationModalProps {
  contacts: Contact[];
  onAddContact: (contact: Contact) => void;
  activeDraft?: {
    recipientName: string;
    recipientPhone: string;
    message: string;
  } | null;
  onClearDraft?: () => void;
  onDispatchMessage: (phone: string, text: string, contactName: string) => void;
  onCallContact?: (phone: string, contactName: string) => void;
}

export const WhatsAppAutomationModal: React.FC<WhatsAppAutomationModalProps> = ({
  contacts,
  onAddContact,
  activeDraft,
  onClearDraft,
  onDispatchMessage,
  onCallContact,
}) => {
  const [selectedContact, setSelectedContact] = useState<Contact>(
    contacts.find((c) => c.relation.toLowerCase() === 'mother') ||
      contacts[0] || {
        id: 'c-fallback',
        name: 'Mother',
        relation: 'Mother',
        phone: '+919876543210',
        avatar: '',
        status: 'online',
      }
  );
  const [messageText, setMessageText] = useState<string>('');
  const [sentHistory, setSentHistory] = useState<
    { id: string; contact: string; phone: string; message: string; timestamp: string; status: 'sent' | 'delivered' | 'read' }[]
  >([
    {
      id: 'wa-1',
      contact: 'Mother',
      phone: '+91 98765 43210',
      message: 'Hello Mom, on my way home!',
      timestamp: '10:15 AM',
      status: 'read',
    },
  ]);
  const [showAddContact, setShowAddContact] = useState<boolean>(false);
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactRelation, setNewContactRelation] = useState<string>('');
  const [newContactPhone, setNewContactPhone] = useState<string>('');

  // Sync draft if provided by Jarvis voice command
  React.useEffect(() => {
    if (activeDraft) {
      const match = contacts.find(
        (c) =>
          c.relation.toLowerCase() === activeDraft.recipientName.toLowerCase() ||
          c.name.toLowerCase() === activeDraft.recipientName.toLowerCase()
      );
      if (match) {
        setSelectedContact(match);
      }
      setMessageText(activeDraft.message);
    }
  }, [activeDraft, contacts]);

  const handleSend = () => {
    if (!messageText.trim()) return;

    jarvisAudio.playWhatsAppDispatch();

    const newRecord = {
      id: `wa-${Date.now()}`,
      contact: selectedContact.relation || selectedContact.name,
      phone: selectedContact.phone,
      message: messageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent' as const,
    };

    setSentHistory((prev) => [newRecord, ...prev]);

    // Perform actual external dispatch via wa.me link
    onDispatchMessage(selectedContact.phone, messageText.trim(), selectedContact.relation || selectedContact.name);

    // Simulate delivery ticks
    setTimeout(() => {
      setSentHistory((prev) =>
        prev.map((item) => (item.id === newRecord.id ? { ...item, status: 'delivered' } : item))
      );
    }, 1500);

    setTimeout(() => {
      setSentHistory((prev) =>
        prev.map((item) => (item.id === newRecord.id ? { ...item, status: 'read' } : item))
      );
    }, 3200);

    setMessageText('');
    onClearDraft?.();
  };

  const handleAddNewContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const contact: Contact = {
      id: `c-${Date.now()}`,
      name: newContactName.trim(),
      relation: newContactRelation.trim() || newContactName.trim(),
      phone: newContactPhone.trim(),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      status: 'online',
    };

    onAddContact(contact);
    setSelectedContact(contact);
    setShowAddContact(false);
    setNewContactName('');
    setNewContactRelation('');
    setNewContactPhone('');
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-900/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-orbitron font-bold text-sm tracking-wide text-white flex items-center gap-2">
              WHATSAPP AUTOMATION GATEWAY
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                ACTIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Voice command: "Jarvis send message to my mother: I'm coming home"
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getAndroidBackgroundStatus().isNativeAndroid && (
            <button
              type="button"
              onClick={() => {
                jarvisAudio.playTerminalTick();
                requestAccessibilityAutoSendPermission();
              }}
              className={`text-xs font-mono flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                getAndroidBackgroundStatus().accessibilityEnabled
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40'
              }`}
              title="Enable zero-tap WhatsApp sending via Android Accessibility Service"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>
                {getAndroidBackgroundStatus().accessibilityEnabled ? 'AUTO-SEND ON' : 'ENABLE AUTO-SEND'}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowAddContact(!showAddContact)}
            className="text-xs font-mono flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD CONTACT</span>
          </button>
        </div>
      </div>

      {/* Add Contact Modal Drawer */}
      {showAddContact && (
        <form
          onSubmit={handleAddNewContact}
          className="p-3 rounded-lg border border-cyan-500/30 bg-slate-900/90 space-y-3"
        >
          <div className="text-xs font-orbitron font-semibold text-cyan-300">REGISTER NEW CONTACT IN DIRECTORY</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Name (e.g. Martha)"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              className="bg-black/60 border border-cyan-900 text-xs text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-cyan-400"
              required
            />
            <input
              type="text"
              placeholder="Relation / Voice alias (e.g. Mother, Dad)"
              value={newContactRelation}
              onChange={(e) => setNewContactRelation(e.target.value)}
              className="bg-black/60 border border-cyan-900 text-xs text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-cyan-400"
            />
            <input
              type="text"
              placeholder="Phone (e.g. +919876543210)"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              className="bg-black/60 border border-cyan-900 text-xs text-slate-200 px-2.5 py-1.5 rounded focus:outline-none focus:border-cyan-400"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddContact(false)}
              className="text-xs px-3 py-1 rounded text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs font-mono px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded"
            >
              Save Contact
            </button>
          </div>
        </form>
      )}

      {/* Contacts Carousel / Chips */}
      <div>
        <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
          <span>SELECT RECIPIENT DIRECTORY</span>
          <span className="text-cyan-400">{contacts.length} CONTACTS STORED</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {contacts.map((contact) => {
            const isSelected = selectedContact.id === contact.id;
            return (
              <button
                key={contact.id}
                onClick={() => {
                  setSelectedContact(contact);
                  jarvisAudio.playTerminalTick();
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left shrink-0 transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'border-slate-800 bg-black/40 hover:border-cyan-900 text-slate-300'
                }`}
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/30 flex items-center justify-center font-bold text-xs text-cyan-300">
                    {contact.relation.slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-black ${
                      contact.status === 'online' ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    {contact.relation}
                    {isSelected && <span className="text-[9px] text-emerald-400 font-mono">SELECTED</span>}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">{contact.phone}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Composer & Live Dispatch Card */}
      <div className="p-4 rounded-xl border border-cyan-500/30 bg-black/70 relative">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <User className="w-3.5 h-3.5" />
            RECIPIENT: <strong className="text-white">{selectedContact.relation}</strong> ({selectedContact.phone})
          </span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            WHATSAPP WEB HOOK READY
          </span>
        </div>

        <textarea
          rows={3}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder={`Speak: "Jarvis send message to ${selectedContact.relation}: [your message]" or type here...`}
          className="w-full bg-slate-950/80 border border-cyan-900/60 rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {/* Quick preset phrases */}
          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
            {['I am on my way home', 'Please call me when free', 'Dinner ready?', 'Reaching in 10 minutes'].map((preset) => (
              <button
                key={preset}
                onClick={() => setMessageText(preset)}
                className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 hover:bg-cyan-900/50 hover:text-white transition-colors"
              >
                + {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {onCallContact && (
              <button
                type="button"
                onClick={() => onCallContact(selectedContact.phone, selectedContact.relation || selectedContact.name)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-orbitron font-bold text-xs uppercase tracking-wider border border-cyan-400/50 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 transition-all cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>CALL NOW</span>
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={!messageText.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-orbitron font-bold text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-black transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>DISPATCH NOW</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dispatched Messages Feed with Checkmarks */}
      <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto space-y-2 p-3 rounded-xl border border-slate-800 bg-slate-950/60">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>RECENT WHATSAPP AUTOMATION LOG</span>
          <span>REAL-TIME DELIVERY TELEMETRY</span>
        </div>

        {sentHistory.map((item) => (
          <div
            key={item.id}
            className="p-2.5 rounded-lg border border-slate-800 bg-black/40 flex items-start justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="font-bold text-emerald-400">{item.contact}</span>
                <span className="text-slate-500">({item.phone})</span>
                <span className="text-slate-600">{item.timestamp}</span>
              </div>
              <p className="text-slate-200 font-sans">{item.message}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-mono">
              {item.status === 'sent' && (
                <span className="text-slate-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Sent
                </span>
              )}
              {item.status === 'delivered' && (
                <span className="text-slate-300 flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> Delivered
                </span>
              )}
              {item.status === 'read' && (
                <span className="text-cyan-400 flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-400" /> Read
                </span>
              )}
              <a
                href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(item.message)}`}
                target="_blank"
                rel="noreferrer"
                title="Open thread in WhatsApp Web"
                className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
