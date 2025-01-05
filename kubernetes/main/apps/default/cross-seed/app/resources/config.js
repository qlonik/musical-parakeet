const qbCompleteDir = (dir) => `/media/downloads/qbittorrent/complete/${dir}`;
const prowlarrUrl = (id) =>
  `http://prowlarr.default.svc.cluster.local:9696/${id}/api?apikey=${process.env.PROWLARR_API_KEY}`;

module.exports = {
  torznab: [
    /* fl   */ "18",
    /* ar   */ "19",
    /* tl   */ "20",
    /* uhdb */ "21",
    /* blu  */ "22",
    /* ant  */ "23",
    /* mam  */ "92",
  ].map((_) => prowlarrUrl(_)),
  sonarr: [
    `http://sonarr.default.svc.cluster.local:8989/?apikey=${process.env.SONARR_API_KEY}`,
  ],
  radarr: [
    `http://radarr.default.svc.cluster.local:7878/?apikey=${process.env.RADARR_API_KEY}`,
  ],

  apiKey: process.env.XSEED_API_KEY,
  qbittorrentUrl: "http://qbittorrent.default.svc.cluster.local:8080",
  delay: 30,

  dataDirs: [
    "lidarr",
    "manual",
    "prowlarr",
    "radarr",
    "readarr/audio",
    "readarr/ebook",
    "sonarr",
  ].map((_) => qbCompleteDir(_)),
  linkCategory: "cross-seed",
  linkDir: qbCompleteDir("cross-seed"),
  linkType: "hardlink",

  torrentDir: "/qbittorrent/qBittorrent/BT_backup",
  outputDir: "/qbittorrent/xseeds",

  action: "inject",
  duplicateCategories: true,
  flatLinking: false,
  includeNonVideos: false,
  includeSingleEpisodes: true,
  matchMode: "safe",
};
