(function () {
    'use strict';
    const line = (text, emotion = 'happy') => Object.freeze({ text, emotion });
    const greetings = ['来啦？今天也陪你。', '等到你啦~', '我在呢，慢慢来。'];
    const common = [
        line('好啦好啦，给你摸摸头。'), line('手掌摊开给我看看。'),
        line('哼，这次就原谅你啦。', 'pout'), line('说好只戳一下的！', 'angry')
    ];
    const library = {
        characters: [line('今天想和谁见面呀？'), line('这次的故事，也带上我嘛。')],
        gallery: [line('这张好看，眼光不错嘛。'), line('看照片就看照片，怎么又戳我！', 'pout')],
        settings: [line('我陪你慢慢挑。'), line('你调设置，我负责陪着。')],
        advanced: [line('认真工作中……好吧，陪你玩一下。'), line('小爪子也能帮忙的！')],
        about: [line('看到我的名字了吗？'), line('嘿嘿，被你发现我在这里了。')],
        menu: [line('有事找我，没事也可以呀。'), line('先陪你一会儿，再回故事里。')]
    };
    const shuffle = values => {
        const deck = [...values];
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    };
    // One in-memory deck per page, shared by every mascot instance for this launch.
    const pages = new Map(Object.entries(library).map(([key, values]) => [key, {
        count: 0, next: 0, deck: shuffle([...values, ...common])
    }]));
    let greeted = false;
    window.RPMascotDialogue = Object.freeze({
        poke(context) {
            const page = pages.get(context) || pages.get('characters');
            page.count++;
            if (page.count === 1) return line('甭戳啦~ 脸要肿啦 ~', 'pout');
            if (page.count === 2) return line('再戳我要咬你了！', 'angry');
            return page.deck[page.next++ % page.deck.length];
        },
        greeting() {
            if (greeted) return null;
            greeted = true;
            return line(greetings[Math.floor(Math.random() * greetings.length)]);
        }
    });
})();
