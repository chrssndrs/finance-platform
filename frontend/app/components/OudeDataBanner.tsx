"use client";

import { useEffect, useState } from "react";

import { getInstellingen, getStatus } from "@/lib/api";

export function OudeDataBanner() {
  const [teOud, setTeOud] = useState(false);
  const [dagenOud, setDagenOud] = useState(0);

  useEffect(() => {
    Promise.all([getStatus(), getInstellingen()])
      .then(([status, instellingenRes]) => {
        if (!status.laatste_transactie) return;
        const dagen = Math.floor(
          (Date.now() - new Date(status.laatste_transactie).getTime()) / (1000 * 60 * 60 * 24)
        );
        setDagenOud(dagen);
        setTeOud(dagen > instellingenRes.instellingen.data_te_oud_na_dagen);
      })
      .catch(() => {});
  }, []);

  if (!teOud) return null;

  return (
    <div className="bg-red-600 px-4 py-1.5 text-center text-xs font-medium text-white">
      Data is verouderd — laatste transactie is {dagenOud} dagen geleden. Controleer de pipeline.
    </div>
  );
}
