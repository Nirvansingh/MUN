'use client';

import SpeechTimer from './SpeechTimer';
import MunFact from './MunFact';
import MyCountrySelector from './MyCountrySelector';

/**
 * Groups the always-mounted floating widgets (SpeechTimer, MunFact,
 * MyCountrySelector) so shells can lazy-load them as a single shared chunk.
 */
export default function Widgets() {
  return (
    <>
      <SpeechTimer />
      <MunFact />
      <MyCountrySelector />
    </>
  );
}
