import { db } from "@/lib/db";
import { existsSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";

export async function POST() {
  try {
    const pollImagesDir = join(process.cwd(), "public", "poll-images");
    
    if (!existsSync(pollImagesDir)) {
      return Response.json({ 
        success: true, 
        message: "Image directory does not exist",
        removedCount: 0 
      });
    }
    
    const allFiles = readdirSync(pollImagesDir).filter(file => 
      file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".jpeg") || file.endsWith(".gif") || file.endsWith(".webp")
    );
    
    const usedImages = new Set<string>();
    
    const polls = await db.poll.findMany({
      select: { imageUrl: true },
    });
    
    const questions = await db.question.findMany({
      select: { imageUrl: true },
    });
    
    polls.forEach(poll => {
      if (poll.imageUrl && poll.imageUrl.startsWith("/poll-images/")) {
        usedImages.add(poll.imageUrl.replace("/poll-images/", ""));
      }
    });
    
    questions.forEach(question => {
      if (question.imageUrl && question.imageUrl.startsWith("/poll-images/")) {
        usedImages.add(question.imageUrl.replace("/poll-images/", ""));
      }
    });
    
    let removedCount = 0;
    
    for (const file of allFiles) {
      if (!usedImages.has(file)) {
        const filePath = join(pollImagesDir, file);
        try {
          unlinkSync(filePath);
          removedCount++;
        } catch (err) {
          console.error(`Failed to delete ${file}:`, err);
        }
      }
    }
    
    return Response.json({ 
      success: true, 
      message: `Removed ${removedCount} unused image files`,
      removedCount 
    });
    
  } catch (err) {
    console.error("Clean up images error:", err);
    return Response.json({ 
      success: false, 
      error: "Failed to clean up images" 
    }, { status: 500 });
  }
}
