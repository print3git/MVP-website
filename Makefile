.PHONY: size-audit

size-audit:
	@echo "git count-objects -vH"
	@echo "git-sizer -v"
	@echo "git reflog expire --expire=now --all && git gc --prune=now --aggressive"
