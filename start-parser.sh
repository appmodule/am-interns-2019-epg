mkdir -p $IMAGE_FOLDER
cd $IMAGE_FOLDER
mkdir -p {{0..9},{a..z},{A..Z}}/{{0..9},{a..z},{A..Z}} 
cd -
node index.js parse
