/**
 * The fighting styles a class or subclass offers, by name, as the Fighter,
 * Paladin and Ranger pages describe them (and Tasha's additions). A feature's
 * `grants.fightingStyle` names which of these to choose from; the one chosen
 * goes on the sheet as a feature with this text.
 */
import type { FeatureOption } from "~/types/fifth";
import { keyOf } from "./core";

const STYLES: { name: string; text: string }[] = [
  { name: "Archery", text: "+2 to attack rolls you make with ranged weapons." },
  { name: "Blind Fighting", text: "You have blindsight to 10 feet: you see anything not behind total cover there, even in darkness or while blinded, and an invisible creature unless it hides from you." },
  { name: "Defense", text: "+1 to AC while you wear armor." },
  { name: "Dueling", text: "+2 to damage rolls with a melee weapon held in one hand, and no other weapon." },
  { name: "Great Weapon Fighting", text: "When you roll a 1 or 2 on a damage die for a melee weapon held in two hands, reroll it and take the new roll." },
  { name: "Interception", text: "When a creature you can see hits another within 5 feet of you, your reaction (with a shield or weapon in hand) reduces the damage by 1d10 plus your proficiency bonus." },
  { name: "Protection", text: "When a creature you can see attacks a target other than you within 5 feet, your reaction (with a shield) gives the attack disadvantage." },
  { name: "Thrown Weapon Fighting", text: "You can draw a thrown weapon as part of the attack, and add +2 to its damage." },
  { name: "Two-Weapon Fighting", text: "When you fight with two weapons, add your ability modifier to the second attack's damage." },
  { name: "Unarmed Fighting", text: "Your unarmed strikes deal 1d6 + Strength (1d8 with both hands free), and a creature you grapple takes 1d4 at the start of each of your turns." },
  { name: "Superior Technique", text: "You learn one Battle Master manoeuvre and gain a d6 superiority die that comes back on a short or long rest." },
  { name: "Blessed Warrior", text: "You learn two cleric cantrips, cast with Charisma, and can swap one for another when you gain a paladin level." },
  { name: "Druidic Warrior", text: "You learn two druid cantrips, cast with Wisdom, and can swap one for another when you gain a ranger level." },
];

export const FIGHTING_STYLES: Record<string, FeatureOption> = Object.fromEntries(
  STYLES.map((style) => [style.name, { key: keyOf(style.name), ...style }])
);

/** The styles the Fighter chooses from: the Player's Handbook six and Tasha's five. */
export const FIGHTER_STYLES = [
  "Archery",
  "Blind Fighting",
  "Defense",
  "Dueling",
  "Great Weapon Fighting",
  "Interception",
  "Protection",
  "Superior Technique",
  "Thrown Weapon Fighting",
  "Two-Weapon Fighting",
  "Unarmed Fighting",
];

/** A style's text, by name; empty for a style the rules don't know. */
export function fightingStyleText(name: string): string {
  return FIGHTING_STYLES[name]?.text ?? "";
}
