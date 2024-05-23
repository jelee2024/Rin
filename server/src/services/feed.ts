import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import db from "../db/db";
import { feeds } from "../db/schema";
import { setup } from "../setup";
import { bindTagToPost } from "./tag";

export const FeedService = new Elysia()
    .use(setup)
    .group('/feed', (group) =>
        group
            .get('/', async () => {
                const feed_list = (await db.query.feeds.findMany({
                    where: eq(feeds.draft, 0),
                    columns: {
                        draft: false
                    },
                    with: { hashtags: true, user: true }
                }));
                return feed_list;
            })
            .post('/', async ({ admin, set, uid, body: { title, content, draft, tags } }) => {
                if (!admin) {
                    set.status = 403;
                    return 'Permission denied';
                }
                const result = await db.insert(feeds).values({
                    title,
                    content,
                    uid,
                    draft: draft ? 1 : 0
                }).returning({ insertedId: feeds.id });
                bindTagToPost(result[0].insertedId, tags);
                if (result.length === 0) {
                    set.status = 500;
                    return 'Failed to insert';
                } else {
                    return result[0].insertedId;
                }
            }, {
                body: t.Object({
                    title: t.String(),
                    content: t.String(),
                    draft: t.Boolean(),
                    tags: t.Array(t.String())
                })
            })
            .get('/:id', async ({ set, params: { id } }) => {
                const id_num = parseInt(id);
                const feed = await db.query.feeds.findFirst({
                    where: eq(feeds.id, id_num),
                    columns: {
                        draft: false
                    },
                    with: { hashtags: true, user: true }
                });
                if (!feed) {
                    set.status = 404;
                    return 'Not found';
                }
                return feed;
            })

    )