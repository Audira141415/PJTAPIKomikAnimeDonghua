const path = require('path');
const fs = require('fs/promises');
const axios = require('axios');
const {              Manga, History              } = require('@models');
const { chapterRepository: chapterRepo } = require('@repositories');
const ApiError = require('@core/errors/ApiError');
const { paginate, paginateMeta } = require('@core/utils/paginate');
const { env } = require('@core/config/env');

const createChapter = async ({ chapterNumber, title, mangaId }, files) => {
  const manga = await Manga.findById(mangaId);
  if (!manga) throw new ApiError(404, 'Manga not found');

  const existing = await chapterRepo.findOne({ manga: mangaId, chapterNumber });
  if (existing) throw new ApiError(409, `Chapter ${chapterNumber} already exists for this manga`);

  const chapter = await chapterRepo.create({ chapterNumber, title, manga: mangaId });

  if (files && files.length > 0) {
    const uploadDir = path.join(env.UPLOAD_DIR, 'manga', mangaId, chapter._id.toString());
    await fs.mkdir(uploadDir, { recursive: true });

    const images = await Promise.all(
      files.map(async (file) => {
        const safeFilename = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
        const destPath = path.join(uploadDir, safeFilename);
        await fs.rename(file.path, destPath);
        return `/uploads/manga/${mangaId}/${chapter._id}/${safeFilename}`;
      })
    );

    chapter.images = images;
    await chapterRepo.save(chapter);
  }

  return chapter;
};

const getChaptersByManga = async (mangaId, query) => {
  const { page, limit } = query;
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const [chapters, total] = await Promise.all([
    chapterRepo.findList({ mangaId, skip, limit: perPage }),
    chapterRepo.count(mangaId),
  ]);

  return { chapters, meta: paginateMeta(total, currentPage, perPage) };
};

const getChapterById = async (id) => {
  const chapter = await chapterRepo.findById(id);
  if (!chapter) throw new ApiError(404, 'Chapter not found');
  return chapter;
};

const deleteChapter = async (id) => {
  const chapter = await chapterRepo.deleteById(id);
  if (!chapter) throw new ApiError(404, 'Chapter not found');

  // M-10: Cascade delete history entries referencing this chapter
  await History.deleteMany({ chapter: id });

  const uploadDir = path.join(
    env.UPLOAD_DIR, 'manga', chapter.manga.toString(), chapter._id.toString()
  );
  try {
    await fs.rm(uploadDir, { recursive: true, force: true });
  } catch {
    // Non-critical: directory may not exist if chapter had no images
  }

  return chapter;
};

module.exports = { createChapter, getChaptersByManga, getChapterById, deleteChapter, getChapterImages };

// ── Ambil URL gambar chapter dari MangaDex (on-demand, dengan cache) ──────────
async function getChapterImages(id) {
  const chapter = await chapterRepo.findById(id);
  if (!chapter) throw new ApiError(404, 'Chapter not found');

  // Sudah ada gambar di DB → langsung return (cache hit)
  if (chapter.images && chapter.images.length > 0) {
    return { images: chapter.images, cached: true };
  }

  // Belum ada → harus punya mdChapterId
  if (!chapter.mdChapterId) {
    return { images: [], cached: false };
  }

  // Ambil dari MangaDex@Home
  const { data } = await axios.get(
    `https://api.mangadex.org/at-home/server/${chapter.mdChapterId}`,
    { timeout: 10000 }
  );

  const { baseUrl, chapter: { hash, dataSaver } } = data;
  const images = dataSaver.map((fn) => `${baseUrl}/data-saver/${hash}/${fn}`);

  // Cache ke DB agar request berikutnya tidak perlu panggil MangaDex lagi
  chapter.images = images;
  await chapterRepo.save(chapter);

  return { images, cached: false };
}
