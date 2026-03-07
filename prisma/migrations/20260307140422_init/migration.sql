-- CreateTable
CREATE TABLE "Page" (
    "id" SERIAL NOT NULL,
    "mangaName" TEXT NOT NULL,
    "chapterNumber" DECIMAL(65,30) NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "pageUrl" TEXT NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Panel" (
    "id" SERIAL NOT NULL,
    "pageId" INTEGER NOT NULL,
    "panelIndex" INTEGER NOT NULL,
    "panelUrl" TEXT NOT NULL,
    "dialogDescription" JSONB,

    CONSTRAINT "Panel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_mangaName_chapterNumber_pageNumber_key" ON "Page"("mangaName", "chapterNumber", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Panel_pageId_panelIndex_key" ON "Panel"("pageId", "panelIndex");

-- AddForeignKey
ALTER TABLE "Panel" ADD CONSTRAINT "Panel_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
