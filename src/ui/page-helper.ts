import { conf } from "../config";
import EBUS from "../event-bus";
import { FetchState } from "../img-fetcher";
import { Chapter } from "../page-fetcher";
import { evLog } from "../utils/ev-log";
import { Elements } from "./html";

export class PageHelper {
  html: Elements;
  chapterIndex: number = 0;
  constructor(html: Elements, getChapter: (index: number) => Chapter) {
    this.html = html;
    EBUS.subscribe("pf-change-chapter", (index) => {
      this.chapterIndex = index;
      const queue = getChapter(index)?.queue;
      if (!queue) return;
      const finished = queue.filter(imf => imf.stage === FetchState.DONE).length;
      this.setPageState({ finished: finished.toString(), total: queue.length.toString(), current: "1" });
    });
    EBUS.subscribe("bifm-on-show", () => this.minify(true, "bigImageFrame"));
    EBUS.subscribe("bifm-on-hidden", () => this.minify(false, "bigImageFrame"));
    EBUS.subscribe("ifq-do", (index, imf) => {
      if (imf.chapterIndex !== this.chapterIndex) return;
      const queue = getChapter(this.chapterIndex)?.queue;
      if (!queue) return;
      this.setPageState({ current: (index + 1).toString() });
      if (imf.stage !== FetchState.DONE) {
        this.setFetchState("fetching");
      }
    });
    EBUS.subscribe("ifq-on-finished-report", (index, queue) => {
      if (queue.chapterIndex !== this.chapterIndex) return;
      this.setPageState({ finished: queue.finishedIndex.size.toString() });
      evLog("info", `No.${index + 1} Finished，Current index at No.${queue.currIndex + 1}`);
      if (queue[queue.currIndex].stage === FetchState.DONE) {
        this.setFetchState("fetched");
      }
    });
    EBUS.subscribe("pf-on-appended", (total, _ifs, done) => {
      this.setPageState({ total: `${total}${done ? "" : ".."}` });
    });
    html.currPageElement.addEventListener("click", (event) => {
      const ele = event.target as HTMLElement;
      const index = parseInt(ele.getAttribute("data-index") || "1") - 1;
      const queue = getChapter(this.chapterIndex)?.queue;
      if (!queue) return;
      EBUS.emit("imf-on-click", queue[index]);
    });
  }
  private setFetchState(state: "fetching" | "fetched") {
    if (state === "fetching") {
      this.html.pageHelper.classList.add("p-helper-fetching");
    } else {
      this.html.pageHelper.classList.remove("p-helper-fetching");
    }
  }

  private setPageState({ total, current, finished }: { total?: string, current?: string, finished?: string }) {
    if (total !== undefined) {
      this.html.totalPageElement.textContent = total;
    }
    if (current !== undefined) {
      this.html.currPageElement.textContent = current;
    }
    if (finished !== undefined) {
      this.html.finishedElement.textContent = finished;
    }
  }

  minify(ok: boolean, level: "fullViewGrid" | "bigImageFrame") {
    switch (conf.minifyPageHelper) {
      case "inBigMode":
        if (level === "fullViewGrid") {
          return;
        }
        break;
      case "always":
        if (level === "bigImageFrame") {
          return;
        }
        break;
      case "never":
        this.html.pageHelper.classList.remove("p-minify");
        return;
    }
    if (ok) {
      this.html.pageHelper.classList.add("p-minify");
    } else {
      this.html.pageHelper.classList.remove("p-minify");
    }
  }
}
