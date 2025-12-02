import { Jimp } from "jimp";

async function removeBackground() {
  const image = await Jimp.read("public/logo.png");
  const threshold = 30; // Tolerance for black color

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
    const red = image.bitmap.data[idx + 0];
    const green = image.bitmap.data[idx + 1];
    const blue = image.bitmap.data[idx + 2];

    // If pixel is close to black, make it transparent
    if (red < threshold && green < threshold && blue < threshold) {
      image.bitmap.data[idx + 3] = 0; // Set alpha to 0 (transparent)
    }
  });

  await image.write("public/logo.png");
  console.log("Background removed from public/logo.png");
}

removeBackground().catch(console.error);
