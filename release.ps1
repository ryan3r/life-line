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

# Run the build
gulp prod

# Deploy to firebase
firebase deploy
