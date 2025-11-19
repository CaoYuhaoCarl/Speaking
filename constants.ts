import { LessonSegment } from './types';

export const APP_NAME = "ReciteMaster";

export const DEFAULT_RAW_TEXT = `Lesson 117 Tommy's breakfast
When my husband was going into the dining room this morning, he dropped some coins on the floor.
There were coins everywhere. We looked for them, but we could not find them all.
While we were having breakfast, our little boy, Tommy, found two small coins on the floor.
He put them both into his mouth. We both tried to get the coins, but it was too late. Tommy had already swallowed them!
Late that morning, when I was doing the housework, my husband phoned me from the office.
'How's Tommy?' he asked. 'I don't know,' I answered, 'Tommy's been to the toilet three times this morning, but I haven't had any change yet!'`;

// Kept for fallback or quick start
export const LESSON_DATA: LessonSegment[] = [
  {
    id: 1,
    english: "When my husband was going into the dining room this morning, he dropped some coins on the floor.",
    chinese: "今天早晨我丈夫走进饭厅时，把一些硬币掉在地上了。"
  },
  {
    id: 2,
    english: "There were coins everywhere. We looked for them, but we could not find them all.",
    chinese: "到处都是硬币。我们虽然找了，但没有把它们全部找到。"
  },
  {
    id: 3,
    english: "While we were having breakfast, our little boy, Tommy, found two small coins on the floor.",
    chinese: "正当我们吃早饭时，我们的小男孩汤米在地上找到两枚小硬币。"
  },
  {
    id: 4,
    english: "He put them both into his mouth. We both tried to get the coins, but it was too late. Tommy had already swallowed them!",
    chinese: "他把这两枚硬币全都放进嘴里。我们俩都试图把这两枚硬币拿出来，但太迟了。汤米已经把硬币咽了下去！"
  },
  {
    id: 5,
    english: "Late that morning, when I was doing the housework, my husband phoned me from the office.",
    chinese: "那天下午的晚些时候，当我正做家务时，我丈夫从办公室打来电话。"
  },
  {
    id: 6,
    english: "'How's Tommy?' he asked. 'I don't know,' I answered, 'Tommy's been to the toilet three times this morning, but I haven't had any change yet!'",
    chinese: "“汤米怎么样？”他问。“我不知道”，我回答说，“今天上午汤米去了3次厕所了，但我还没看到硬币！”"
  }
];