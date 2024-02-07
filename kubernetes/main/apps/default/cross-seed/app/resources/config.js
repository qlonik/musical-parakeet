const qbCompleteDir = "/media/downloads/qbittorrent/complete";
const prowlarrUrl = (id) =>
  `http://prowlarr.default.svc.cluster.local:9696/${id}/api?apikey=${process.env.PROWLARR_API_KEY}`;

module.exports = {
  delay: 20,
  qbittorrentUrl: "http://qbittorrent.default.svc.cluster.local:8080",
  torznab: [
    /* fl   */ prowlarrUrl("18"),
    /* ar   */ prowlarrUrl("19"),
    /* tl   */ prowlarrUrl("20"),
    /* uhdb */ prowlarrUrl("21"),
    /* blu  */ prowlarrUrl("22"),
    /* ant  */ prowlarrUrl("23"),
  ],
  port: process.env.CROSSSEED_PORT || 80,
  apiAuth: false,
  action: "inject",
  includeEpisodes: false,
  includeSingleEpisodes: true,
  includeNonVideos: true,
  duplicateCategories: true,
  matchMode: "safe",
  skipRecheck: true,
  linkType: "hardlink",
  linkDir: `${qbCompleteDir}/cross-seed`,
  dataDirs: [
    `${qbCompleteDir}/lidarr`,
    `${qbCompleteDir}/manual`,
    `${qbCompleteDir}/prowlarr`,
    `${qbCompleteDir}/radarr`,
    `${qbCompleteDir}/readarr/audio`,
    `${qbCompleteDir}/readarr/ebook`,
    `${qbCompleteDir}/sonarr`,
  ],
  maxDataDepth: 1,
  outputDir: "/config/xseeds",
  torrentDir: "/config/qBittorrent/BT_backup",
};
