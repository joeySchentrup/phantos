/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Seeds the Chronicle with what the lore already says about time.
 *
 * - ERAS are the periods the documents name. A start of 0 is "since the
 *   beginning"; an end of 0 is "still going".
 * - POINTS are the entries of the two timelines, "History of Hurley" and
 *   "History of the Kobold Empire", without their footnotes.
 *
 * Negative years are BC, positive are AC. Runs once; the Dungeon Master can
 * edit or delete anything it adds.
 */

const ERAS = [
  { name: 'Era of Awakening', start: 0, end: -10000, circa: true, description: 'The age of dawn after the Great Hatching, when the Primal Dragons shaped the world, the Twins and the Greater Dragons.' },
  { name: 'Drynell Empire', start: -9500, end: -8500, circa: true, description: 'The empire of the Seven Emperors: the second time Hurley was united under one government.' },
  { name: 'Holy Drynell Empire', start: -7000, end: -500, circa: true, description: 'Founded by King Ottomus of Pomera. It splintered c. 5000 BC and was united in name only until Ismakale gathered its last princes.' },
  { name: 'League Wars', start: -103, end: 1, circa: false, description: 'A four-way war between the North, Holy, Ismakalian and Nabatean Leagues, ended by the Treaty of Heraklion.' },
  { name: 'Age of Concord', start: 1, end: 0, circa: false, description: 'The years counted from the Treaty of Heraklion: 1 AC onward.' },
  { name: 'Era of Great Expansion', start: -72, end: 5, circa: false, description: 'Under Vercingetorix the Kobolds spread west across the island chains around Korland.' },
  { name: 'First Kobold Wars', start: 4, end: 17, circa: false, description: 'War between the Kobold Empire and the Dwarven Kingdom, Gnomish Republic and Elven Confederacy, ended by the Treaty of Virandriel.' },
  { name: 'Second Kobold Wars', start: 26, end: 58, circa: false, description: 'Ended by the Treaty of Two Rivers.' },
  { name: 'Zombie Apocalypse', start: 97, end: 182, circa: false, description: 'A plague that left the Kobold Empire relatively unaffected and drew many converts to the Chionites.' },
  { name: 'Great Rebellion', start: 101, end: 158, circa: false, description: 'Led by the New Lanyaru Republic. The Treaty of Udoria reduced the Kobold Empire to Korland and its surrounding islands.' },
  { name: 'Era of Exploration', start: 203, end: 275, circa: false, description: 'From the discovery of Neua by Bobby Joe to the discovery of Hurley by Kobold scouts.' },
  { name: 'Second League War', start: 280, end: 290, circa: false, description: 'Ended by the Treaty of Homosassa, which forced the entire continent into the Hurlen Alliance.' },
  { name: 'Hurlen War (the Tri-War)', start: 301, end: 304, circa: false, description: 'A three-way war between the Hurlen Alliance, the Kobold Empire and the returned Erosian Empire.' },
  { name: 'Post-Tri-War Era', start: 304, end: 0, circa: false, description: 'Nearly every state of Hurley lives as a protectorate of the Kobold Empire.' },
];

const POINTS = [
  // History of Hurley
  { year: -10000, circa: true, text: 'The Erosian Wars. Erosia is banished to the Twilight Realm.' },
  { year: -9500, circa: true, text: 'Founding of the Drynell Empire, the second time the continent of Hurley is united under one government.' },
  { year: -9300, circa: true, text: 'The Great Rebellion. Emperor Ceasarious V declares that all races shall be intermixed so as to avoid further uprisings.' },
  { year: -9100, circa: true, text: 'The city-state of Nabatea is established and soon becomes the centre of trade on the continent.' },
  { year: -9000, circa: true, text: 'Faults begin to show in the strength of the Drynell Empire. Emperor Zarkion IX blames the non-humans, exiling or enslaving them.' },
  { year: -8500, circa: true, text: 'Collapse of the Drynell Empire.' },
  { year: -7000, circa: true, text: 'King Ottomus of Pomera conquers all the Core region of Hurley and is crowned the new Holy Drynell Emperor.' },
  { year: -5000, circa: true, text: 'The Holy Drynell Empire splinters. The country is now united in name only.' },
  { year: -4000, circa: true, text: 'The Dark Cult arises.' },
  { year: -3000, circa: true, text: 'The Holy League forms between several southern countries, who agree to split the land amongst themselves.' },
  { year: -2000, circa: true, text: 'King Falicitus is named the first king of the newly formed nation of Ismakale, inside the Core region.' },
  { year: -1000, circa: true, text: 'The Holy League succeeds in its mission to unite the south.' },
  { year: -500, circa: true, text: 'Ismakale unites the remaining princes of the Core regions of the Holy Drynell Empire.' },
  { year: -103, circa: false, text: 'The League Wars begin.' },
  { year: 1, circa: false, text: 'The Treaty of Heraklion is signed, bringing an end to the League Wars.' },
  { year: 33, circa: false, text: 'Ismakale brings down the Great Walls of Heraklion and occupies the city, the first in history to do so.' },
  { year: 89, circa: false, text: 'Leaders of nations that once belonged to the Northern League begin talks of a new great alliance.' },
  { year: 150, circa: false, text: 'The New Northern Alliance is formed, uniting the northern nations in a compact of defensive protection.' },
  { year: 195, circa: false, text: 'The Northern Alliance spreads its membership to include the western nations and Celeste.' },
  { year: 223, circa: false, text: 'After losing to the Northern Alliance in a war of aggression, Ismakale joins the Alliance.' },
  { year: 277, circa: false, text: 'All but the newly reformed Holy League have joined the Hurlen Alliance.' },
  { year: 280, circa: false, text: 'The Second League War begins.' },
  { year: 290, circa: false, text: 'The Treaty of Homosassa is signed, ending the Second League War and forcing the entire continent into the Hurlen Alliance.' },
  { year: 301, circa: false, text: 'The Hurlen War begins: a three-way war between the Hurlen Alliance, the Kobold Empire and the returned Erosian Empire.' },
  { year: 304, circa: false, text: 'Erosia is reformed. The Hurlen War ends.' },
  { year: 304, circa: false, text: 'The Kobold Empire assumes control over all of Hurley.' },

  // History of the Kobold Empire
  { year: -9000, circa: true, text: 'The Great Kobold Exile.' },
  { year: -8500, circa: true, text: 'Kobold tribesmen first arrive on the subcontinent of Korland, also called Kobold Island. Many die dealing with the snawks.' },
  { year: -7500, circa: true, text: 'The majority of Kobolds on Korland are now immune to the negative effects of snawk venom.' },
  { year: -7000, circa: true, text: 'The Kledgelony is formed to help determine who is meta-capable.' },
  { year: -6500, circa: true, text: 'Snawks are first tamed.' },
  { year: -6000, circa: true, text: 'The Kledgelony becomes the de facto government on Korland.' },
  { year: -5000, circa: true, text: 'The Kobolds on Korland grow numerous enough to form separate tribes.' },
  { year: -4000, circa: true, text: 'The Kledgelony’s power begins to diminish and the local chieftains begin to take power.' },
  { year: -500, circa: true, text: 'Philip I of the Karling Clan unites the Kobold tribes for the first time, but the empire is split after his death a short time later.' },
  { year: -86, circa: false, text: 'Vercingetorix, a descendant of Philip I, unites the warring Kobold tribes for good (86–73 BC).' },
  { year: -72, circa: false, text: 'The Kledgelony declares Vercingetorix the Chosen Emperor of Rokesh and Ruler of all the Kobolds.' },
  { year: -6, circa: false, text: 'The Lanyaru submit to the Kobolds, accepting vassalage.' },
  { year: 1, circa: false, text: 'Chione is born.' },
  { year: 3, circa: false, text: 'Scouts from the Dwarven Kingdom, Gnomish Republic and Elven Confederacy “discover” Korland.' },
  { year: 4, circa: false, text: 'The First Kobold Wars begin.' },
  { year: 6, circa: false, text: 'Chione is captured and brought to the Dwarven Kingdom as a civilian prisoner of war.' },
  { year: 17, circa: false, text: 'The Treaty of Virandriel is signed.' },
  { year: 26, circa: false, text: 'The Second Kobold Wars begin.' },
  { year: 57, circa: false, text: 'Napoleon, Emperor Vercingetorix’s second in command, is killed.' },
  { year: 58, circa: false, text: 'The Treaty of Two Rivers is signed, ending the Second Kobold Wars.' },
  { year: 61, circa: false, text: 'Vercingetorix abdicates the throne. His son, Louis I, ascends.' },
  { year: 77, circa: false, text: 'Chione founds the city of Chiona at the confluence of the two Great Rivers.' },
  { year: 84, circa: false, text: 'Charles, brother of Emperor Louis I, marries Chione.' },
  { year: 86, circa: false, text: 'Birth of James, son of Chione.' },
  { year: 88, circa: false, text: 'Birth of Joan, daughter of Chione.' },
  { year: 96, circa: false, text: 'Vercingetorix the Great dies of old age.' },
  { year: 97, circa: false, text: 'The zombie apocalypse begins. The Kobold Empire is relatively unaffected by the plague.' },
  { year: 101, circa: false, text: 'The Great Rebellion, led by the New Lanyaru Republic.' },
  { year: 156, circa: false, text: 'Emperor Louis I is assassinated without any heirs. After a succession crisis, Joan, daughter of Chione, succeeds to the throne.' },
  { year: 158, circa: false, text: 'The Treaty of Udoria is signed, granting independence to all rebellious factions in the Empire and ending the rebellion.' },
  { year: 182, circa: false, text: 'Chione disappears. James, son of Chione, is named the new Chione, leader of the Chionites. The zombie apocalypse ends.' },
  { year: 203, circa: false, text: 'Neua is discovered by Bobby Joe, marking the beginning of the era of exploration.' },
  { year: 234, circa: false, text: 'The Kobold explorer Crait Kolm explores the eastern coast of Neua and claims the land for the Empire.' },
  { year: 245, circa: false, text: 'Colonists from the Kobold Empire arrive and establish New Korland as a colonial territory.' },
  { year: 267, circa: false, text: 'The Ageless rebellion in the mainlander part of Neua.' },
  { year: 270, circa: false, text: 'The Great Meta purge.' },
  { year: 275, circa: false, text: 'Kobold scouts discover the continent of Hurley. The decision is made to prepare for the invasion.' },
];

migrate(
  (app) => {
    const eras = app.findCollectionByNameOrId('eras');
    for (let i = 0; i < ERAS.length; i++) {
      const record = new Record(eras);
      record.set('name', ERAS[i].name);
      record.set('start_year', ERAS[i].start);
      record.set('end_year', ERAS[i].end);
      record.set('circa', ERAS[i].circa);
      record.set('description', ERAS[i].description);
      app.save(record);
    }

    const points = app.findCollectionByNameOrId('timeline_points');
    for (let i = 0; i < POINTS.length; i++) {
      const record = new Record(points);
      record.set('text', POINTS[i].text);
      record.set('year', POINTS[i].year);
      record.set('circa', POINTS[i].circa);
      app.save(record);
    }
  },
  (app) => {
    for (let i = 0; i < ERAS.length; i++) {
      try {
        app.delete(app.findFirstRecordByData('eras', 'name', ERAS[i].name));
      } catch (err) {
        // already gone
      }
    }
    for (let i = 0; i < POINTS.length; i++) {
      try {
        app.delete(app.findFirstRecordByData('timeline_points', 'text', POINTS[i].text));
      } catch (err) {
        // already gone
      }
    }
  }
);
