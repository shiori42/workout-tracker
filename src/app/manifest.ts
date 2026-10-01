import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "筋トレ管理アプリ",
    short_name: "筋トレ管理",
    description: "トレーニング・身体記録・食事・カロリー管理を1つにまとめる個人向けアプリ",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0f",
    theme_color: "#0b0b0f",
    lang: "ja",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
