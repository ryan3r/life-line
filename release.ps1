param(
	[string] $bumpType
)

# Make sure we have a version type
If(!$bumpType) {
	echo "Please specify the type of version bump to do."
	exit 1
}

# Bump the version
npm version $bumpType

# Push to Github
git push

# Clear the dev build
trash public/*

# Run the build
gulp prod

# Hash the files
node build prod

# Remove the bundle
trash public/bundle.js

# Deploy to firebase
firebase deploy

# Clear the production build
trash public/*

# Run the dev builds
gulp

# Set up the dev env
node build
