import { Link } from "react-router";
import { fileUrl } from "~/backend/api";
import { epithet, sortPantheon } from "~/lib/pantheon";
import type { PantheonSummary } from "~/types/pantheon";
import AttributeOrb from "./AttributeOrb";

/** Pantheon members as a list of small name plates, each linking to its page. */
export default function PantheonPlates({ members }: { members: PantheonSummary[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sortPantheon(members).map((member) => (
        <li key={member.id}>
          <Link
            to={`/pantheon/${member.slug}`}
            className="panel group flex h-full items-center gap-3 p-3 transition-colors hover:border-[#f2c14e]/60"
          >
            {member.image ? (
              <img
                src={fileUrl(member, member.image, "100x100")}
                alt=""
                loading="lazy"
                className="h-11 w-11 shrink-0 rounded border-2 border-[#2b1c10] object-cover"
              />
            ) : (
              <AttributeOrb attribute={member.attributes[0]} size="2.75rem" />
            )}
            <span className="min-w-0">
              <span className="font-card block truncate text-lg font-bold leading-tight text-[#f4e6c3] group-hover:text-[#fff2b0]">
                {member.name}
                {!member.published && <span className="ml-2 text-sm text-[#ffb3a1]">· Draft</span>}
              </span>
              <span className="mt-0.5 flex items-center gap-2 text-sm text-[#c9b78f]">
                <span className="frame-swatch" data-frame={member.rank} aria-hidden="true" />
                <span className="truncate">{epithet(member.rank, member.domain)}</span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
