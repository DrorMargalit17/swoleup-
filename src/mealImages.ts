// Original editorial food illustrations generated for SwoleUp; category inspiration only.
// AI-generated food photos bundled with the app (the hosted viewer blocks
// runtime external images, so each suggestion maps to its dish category).
import imgDefault from './photos/meal-editorial-default.webp';
import imgBowl from './photos/meal-editorial-bowl.webp';
import imgChicken from './photos/meal-editorial-chicken.webp';
import imgEggs from './photos/meal-editorial-eggs.webp';
import imgPasta from './photos/meal-editorial-pasta.webp';
import imgSalad from './photos/meal-editorial-salad.webp';
import imgWrap from './photos/meal-editorial-wrap.webp';
import imgStirfry from './photos/meal-editorial-stirfry.webp';
import imgSoup from './photos/meal-editorial-soup.webp';
import imgSmoothie from './photos/meal-editorial-smoothie.webp';
import imgFish from './photos/meal-editorial-fish.webp';
import imgSnack from './photos/meal-editorial-snack.webp';
import coachAvatarImg from './photos/coach-avatar.webp';

const MAP: Record<string, string> = {
    default: imgDefault,
    bowl: imgBowl,
    chicken: imgChicken,
    eggs: imgEggs,
    pasta: imgPasta,
    salad: imgSalad,
    wrap: imgWrap,
    stirfry: imgStirfry,
    soup: imgSoup,
    smoothie: imgSmoothie,
    fish: imgFish,
    snack: imgSnack,
};

export function mealImage(category: string): string {
    return MAP[category] || imgDefault;
}

export const coachAvatar = coachAvatarImg;
