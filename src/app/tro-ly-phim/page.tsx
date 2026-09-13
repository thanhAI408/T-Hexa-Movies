import type { Metadata } from "next";
import { MovieChat } from "@/components/movie-chat/movie-chat";
import "./chat.css";

export const metadata: Metadata = { title: "Trợ lý AI tìm phim", description: "Kể một cảnh phim, tên nhân vật hoặc chọn tiêu chí. T-Hexa AI giúp bạn tìm lại bộ phim đang nhớ." };
export default function MovieChatPage() { return <MovieChat />; }
