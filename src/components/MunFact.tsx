'use client';

import React, { useState, useMemo, useEffect } from 'react';

const munFacts = [
  'The United Nations was founded on October 24, 1945, after World War II to prevent future conflicts.',
  'The UN has 193 member states — nearly every recognized sovereign nation on Earth.',
  'The UN Security Council has 5 permanent members (P5): USA, UK, France, Russia, and China.',
  'A single "no" vote from any P5 member can veto any UNSC resolution.',
  'The UNHRC (Human Rights Council) is an inter-governmental body of 47 member states.',
  'The first MUN conference was held at Harvard University in 1953.',
  'MUN delegates learn diplomacy, public speaking, negotiation, and critical thinking.',
  'In MUN, "Points" include Point of Order, Point of Inquiry, Point of Personal Privilege, and Point of Information.',
  'A "Moderated Caucus" is a timed debate where the Speaker\'s List is set aside for focused discussion.',
  'An "Unmoderated Caucus" (unmod) allows delegates to freely discuss and draft resolutions.',
  'The "Dais" refers to the Chair, Vice-Chair, and Rapporteur who moderate the committee.',
  'A "Working Paper" is an informal draft that becomes a "Draft Resolution" when formally introduced.',
  'A "Placard" is the sign delegates raise to indicate they wish to speak or vote.',
  'The "Speaker\'s List" (GSL) is the queue of delegates waiting to address the committee.',
  '"Preambulatory Clauses" in resolutions describe the problem and cite past UN actions.',
  '"Operative Clauses" in resolutions state the specific actions the committee will take.',
  'The "Right of Reply" allows a delegate to respond to an insulting remark from another delegate.',
  'The UN Charter is the foundational treaty of the United Nations, signed in 1945.',
  'The Universal Declaration of Human Rights (UDHR) was adopted by the UN in 1948.',
  'The International Court of Justice (ICJ) is the UN\'s principal judicial organ.',
  'The World Health Organization (WHO) is a UN specialized agency focused on global health.',
  'UNESCO (UN Educational, Scientific and Cultural Organization) protects world heritage sites.',
  'The UN peacekeeping budget is about $6.5 billion annually — less than 0.5% of global military spending.',
  'The first UN peacekeeping mission was established in 1948 to monitor the Arab-Israeli ceasefire.',
  'The UN has six official languages: Arabic, Chinese, English, French, Russian, and Spanish.',
  'The UN Headquarters in New York City has diplomatic status — it is not US territory.',
  'The UN Secretary-General is both the chief administrative officer and the face of the UN.',
  'The UN Sustainable Development Goals (SDGs) are 17 goals adopted in 2015 to achieve by 2030.',
  '"Diplomacy is the art of letting someone else have your way." — often attributed to Daniele Vare.',
  '"The United Nations was not created to bring us to heaven, but to save us from hell." — Dag Hammarskjöld.',
  '"We the peoples of the United Nations..." — the first words of the UN Charter.',
  'In MUN, always know your country\'s position — never speak as yourself, always as your delegate.',
  'A strong MUN speech starts with a hook, states your position, and ends with a call to action.',
  'The best MUN delegates listen more than they speak — alliances are built on understanding.',
  'The UN General Assembly (UNGA) is the main deliberative body where every member has one vote.',
  'The Economic and Social Council (ECOSOC) coordinates the UN\'s economic and social work.',
  'The International Criminal Court (ICC) prosecutes individuals for genocide, war crimes, and crimes against humanity.',
  'The UN was awarded the Nobel Peace Prize in 2001 for its work toward a better organized world.',
  'The UN Convention on the Law of the Sea (UNCLOS) governs maritime rights and boundaries.',
  'The Paris Agreement is a legally binding international treaty on climate change, adopted in 2015.',
  'The North Atlantic Treaty Organization (NATO) was founded in 1949 as a collective defense alliance.',
  'The European Union (EU) began as the European Coal and Steel Community in 1951.',
  'The G7 is an informal group of seven major advanced economies: Canada, France, Germany, Italy, Japan, UK, and USA.',
  'The G20 includes the G7 plus emerging economies like China, India, Brazil, Russia, and South Africa.',
  'The World Trade Organization (WTO) sets global rules of trade between nations.',
  'The International Monetary Fund (IMF) provides loans and financial stability to member countries.',
  'The World Bank provides financial and technical assistance to developing countries.',
  'The Organization of Islamic Cooperation (OIC) is the second largest intergovernmental organization after the UN.',
  'The African Union (AU) is a continental union of 55 member states in Africa.',
  'The Arab League is a regional organization of Arab countries in and around North Africa and the Middle East.',
  'The Geneva Conventions establish international legal standards for humanitarian treatment in war.',
  'The Responsibility to Protect (R2P) is a UN principle that states must protect populations from mass atrocities.',
  'The Law of the Sea (UNCLOS) defines territorial waters (12 nm) and exclusive economic zones (200 nm).',
  'The International Atomic Energy Agency (IAEA) promotes peaceful use of nuclear energy.',
  'The Organization for the Prohibition of Chemical Weapons (OPCW) oversees the Chemical Weapons Convention.',
  'The International Maritime Organization (IMO) sets global standards for shipping safety and pollution.',
  'The Food and Agriculture Organization (FAO) leads international efforts to defeat hunger.',
];

export default function MunFact() {
  const [visible, setVisible] = useState(false);
  const [factIndex, setFactIndex] = useState(0);

  const currentFact = useMemo(() => munFacts[factIndex], [factIndex]);

  const nextFact = () => {
    setFactIndex(prev => (prev + 1) % munFacts.length);
  };

  const openWidget = () => {
    setFactIndex(Math.floor(Math.random() * munFacts.length));
    setVisible(true);
  };

  // Close with Esc (broadcast by the keyboard-shortcuts handler).
  useEffect(() => {
    const onEscape = () => setVisible(false);
    window.addEventListener('mun-escape', onEscape);
    return () => window.removeEventListener('mun-escape', onEscape);
  }, []);

  return (
    <>
      <div className="widget-fab widget-fab-tr" title="MUN Fact" aria-label="Open MUN fact"
        role="button" tabIndex={0}
        onClick={openWidget}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openWidget(); }}>
        💡 MUN Fact
      </div>
      {visible && (
        <div className="widget-overlay" onClick={() => setVisible(false)}>
          <div className="widget-popup" role="dialog" aria-modal="true" aria-label="MUN fact"
            onClick={e => e.stopPropagation()}>
            <div className="widget-popup-header">
              <span className="widget-popup-title">💡 MUN Fact</span>
              <button className="widget-popup-close" aria-label="Close MUN fact" onClick={() => setVisible(false)}>✕</button>
            </div>
            <div className="widget-popup-body">
              <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                {currentFact}
              </p>
            </div>
            <div className="widget-popup-footer">
              <button className="widget-btn" onClick={nextFact}>Next Fact</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
