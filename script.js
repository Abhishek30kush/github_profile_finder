"use strict"

// GitFinder-GitHub Profile Finder
// HTML + TailwindCSS + vaniall javascript

const API_BASE="https://api.github.com";

// Dom elements
const searchForm = document.querySelector("#search-form");
const usernameInput=document.querySelector("#username");
const searchButton=document.querySelector("#search-button");
const buttonLabel=document.querySelector("#button-label");
const buttonSpinner=document.querySelector("#button-spinner");

const statusBox=document.querySelector('#status');
const resultsSection=document.querySelector('#results');
const welcomeSection=document.querySelector('#welcome');
const profileCard=document.querySelector('#profile-card');
const repoGrid=document.querySelector("#repo-grid");
const repoCount=document.querySelector("#repo-count");
const allReposLink = document.querySelector("#all-repos-link");

let currentController=null;

// utility functions 

function showStatus(message, type="info"){
    const styles={
        info:"border-blue-400/20 bg-blue-500/10 text-blue-200",
        error:"border-red-400/20 bg-red-500/10 text-red-200",
        success:"border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
    };

    statusBox.className="mx-auto mb-8 max-w-3xl rounded-xl border px-5 py-4 text-sm " + (styles[type] || styles.info);

    statusBox.textContent=message;
}

function hideStatus(){
    statusBox.classList.add("hidden");
    statusBox.textContent="";
}

function setLoading(isLoading){
    searchButton.disabled=isLoading;
    usernameInput.disabled=isLoading;
    buttonSpinner.classList.toggle("hidden", !isLoading);

    buttonLabel.textContent=isLoading?"Searching....": "Search Profile";
}

function formatNumber(value){
    return new Intl.NumberFormat("en", { 
        notation:"compact",
        maximumFractionDigits:1
    }).format(value??0);
}

function formatDate(dateString){

    if(!dateString) return "Unknown";

    const  date=new Date(dateString);
    if(Number.isNaN(date.getTime())) return "Unknown";

    return new Intl.DateTimeFormat("en", {
        day:"numeric", 
        month:"short",
        year:"numeric"
    }).format(date);
}

function createElement(tag, className="", text=""){
    const element=document.createElement(tag);
    if(className){
        element.className=className;
    }

    // use textContent for API-provided text instead of innerHTML.

    if(text!==""){
        element.textContent=text;
    }

    return element;


}

function createLink(url, text, className=""){
    const link=createElement("a", className, text);
    link.href=url;
    link.target="_blank";
    link.rel="noopener noreferrer";

    return link;

}

function createStat(label, value){
    const wrapper=createElement(
        "div", 
        "rounded-xl border border-white/10 bg-white/[0.03] p-4"
    );

    wrapper.append(
        createElement(
            "p", 
            "text-xs uppercase tracking-wider text-slate-500",
            label

        ),
        createElement(
            "p", 
            "mt-2 text-xl font-bold text-white",
            formatNumber(value)
        )
    );
    return wrapper;
}

// github api

async function fetchGitHub(endpoint, signal){
    const response=await fetch(`${API_BASE}${endpoint}`, { 
        headers:{
            Accept:"application/vnd.github+json"
        }, 
        signal
    });

    if(!response.ok){
        if(response.status===404){
            throw new Error("GitHub user not found. Check the username.");

        }

        if(response.status===403 || response.status===429){
            const remaining=response.headers.get("x-ratelimit-remaining");
        
            if(remaining==="0" || response.status===429){
                throw new Error("GitHub API rate limit reached. Please try again later.");
            }

            throw new Error("GitHub temporarily denied the request. Please try again later.");
        }

        if(response.status>=500){
            throw new Error("GitHub server error. Please try again shortly.");

        }

        throw new Error(`Request Failed with status ${response.status}.`);
    }

    return response.json();
}

// profile rendering

function renderProfile(user){
    profileCard.replaceChildren();

    const top=createElement(
        "div",
        "flex flex-col gap-6 sm:flex-row sm:items-start"
    );

    const avatar=createElement(
        "img", 
        "h-28 w-28 shrink-0 rounded-2xl border border-white/10 object-cover"
    );

    avatar.src=user.avatar_url;
    avatar.alt=`${user.login}'s GitHub avatar`;
    avatar.loading="lazy";
    avatar.referrerPolicy="no-referrer";

    const details=createElement("div", "min-w-0 flex-1");

    const heading=createElement("div", "flex flex-wrap items-center gap-3");

    heading.append(
        createElement(
            "h3", 
            "break-words text-2xl font-bold sm:text-3xl",
            user.name || user.login
        ),
        createElement(
            "span",
            "rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-300",
            "GitHub Developer"
        )
    );

    details.append(
        heading, 
        createElement(
            "p",
            "mt-2 text-violet-300",
            `@${user.login}`
        ),
        createElement(
            "p", 
            "mt-4 whitespace-pre-line break-words text-sm leading-6 text-slate-400", 
            user.bio || "This developer has not added a bio yet."
        )
    );

    const meta=createElement(
        "div", 
        "mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400"
    );

    if(user.location){
        meta.append(createElement("span", "", `📍 ${user.location}`));
    }

    if(user.company){
        meta.append(createElement("span", "", `🏢 ${user.company}`));
    }
    
    if(user.blog){
        const rawBlog=String(user.blog).trim();
        let blogUrl;

        try{
            blogUrl=new URL(
                /^https?:\/\//i.test(rawBlog)
                ? rawBlog
                : `https://${rawBlog}`
            );

            if(!["http:", "https:"].includes(blogUrl.protocol)){
                blogUrl=null;
            }
        } catch{
            blogUrl=null;
        }
        if(blogUrl){
            meta.append(
                createLink(
                    blogUrl.href, 
                    "🔗 website",
                    "text-violet-300 hover:text-white" 
                    
                )

            );
        }
    }

    if(user.twitter_username){
        meta.append(
            createLink(
                `https://x.com/${encodeURIComponent(user.twitter_username)}`, 
                "X Social profile", 
                "text-violet-300 hover:text-white"
            )
        );
    }

    details.append(meta);

    const actions=createElement(
        "div", 
        "mt-5 flex flex-wrap gap-3"
    );

    actions.append(
        createLink(
            user.html_url,
            "View GitHub Profile ",
            "rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
        )
    );

    top.append(avatar, details);
    profileCard.append(top, actions);

    const divider=createElement(
        "div",
        "my-7 border-t border-white/10"
    );
    
    const stats=createElement(
        "div",
        "grid grid-cols-2 gap-3 sm:grid-cols-4"
    );
    
    stats.append(
        createStat("Followers", user.followers),
        createStat("Following", user.following),
        createStat("Public repos", user.public_repos),        
        createStat("Public gists", user.public_gists)
    );

    const joined=createElement(
        "p", 
        "mt-6 text-sm text-slate-500",
        `GitHub member since ${formatDate(user.created_at)}`
    );

    profileCard.append(divider, stats, joined);
    
}

// repository rendering
function renderRepositories(repositories){
    repoGrid.replaceChildren();

    repoCount.textContent = 
    `${repositories.length} ${repositories.length===1 ? "repository" : "repositories"}`;

    if(repositories.length===0){
        repoGrid.append(
            createElement(
                "div",
                "rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400 md:col-span-2 lg:col-span-3",
                "No public repositories found for this user."
            )
        );

        return;
    }
    
    repositories.forEach((repo)=>{
        const card=createElement(
            "article", 
            "repo-card flex h-full min-w-0 flex-col rounded-2xl p-5"
        );

        const titleRow=createElement(
            "div",
            "flex items-start justify-between gap-3"
        );

        const title=createLink(
            repo.html_url,
            repo.name,
            "break-all text-base font-semibold text-violet-300 hover:text-violet-200"
        );
        const visibility=createElement(
            "span", 
            "shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-400",
            repo.fork? "Fork" : "Public"
        );
        titleRow.append(title, visibility);
        const description = createElement(
            "p", 
            "mt-4 min-h-12 flex-1 break-words text-sm leading-6 text-slate-400",
            repo.description || "No description provided."
        );

        const stats=createElement(
            "div",
            "mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400"
        );

        if(repo.language){
            const language=createElement(
                "span",
                "inline-flex items-center gap-2"
            );

            const dot=createElement(
                "span", 
                "h-2.5 w-2.5 rounded-full bg-violet-400"
            );

            language.append(dot, document.createTextNode(repo.language));
            stats.append(language);
            
        }


        stats.append(
            createElement("span", "", `★ ${formatNumber(repo.stargazers_count)}`), 
            createElement("span", "", `⑂ ${formatNumber(repo.forks_count)}`)
        );

        const updated = createElement(
            "p",
            "mt-5 border-t border-white/10 pt-4 text-xs text-slate-500",
            `Updated ${formatDate(repo.updated_at)}`
        );

        card.append(titleRow, description, stats, updated);
        repoGrid.append(card);

    });
}

    // serach user

    async function searchUser(rawUsername){
        const username=rawUsername.trim();

        if(!username){
            showStatus("Please enter a GitHub username.", "error");
            usernameInput.focus();
            return;
        }

        // github username are limited to 39 characters. 
        // hyphens cannot be first or last, or repeated consecutively.

        const validUsername=/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?!-)){0,37}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;

        if(!validUsername.test(username)){
            showStatus(
                "Enter a valid GitHub username: letters, numbers and single hyphens only.", 
                "error"
            );
            return;
        }

        // cancel an earlier search if a new search starts.

        if(currentController){
            currentController.abort();

        }

        const controller=new AbortController();
        currentController=controller;

        hideStatus();
        setLoading(true);

        resultsSection.classList.add("hidden");
        welcomeSection.classList.add("hidden");
        
        try{
            showStatus("Fetching GitHub profile...", "info");

            const user=await fetchGitHub(
                `/users/${encodeURIComponent(username)}`,controller.signal
            );

            // if another search has replced this one, don't render stale results.

            if(currentController !==controller) return;

            renderProfile(user);

            allReposLink.href=user.html_url + "?tab=repositories";
            resultsSection.classList.remove("hidden");

            showStatus(
                `Profile loaded successfully for @${user.login}.`,
                "success"
            );
            try{
                const repositories=await fetchGitHub(
                    `/users/${encodeURIComponent(user.login)}/repos?sort=updated&per_page=6&type=owner`,
                    controller.signal
                );

                if(currentController!==controller) return;

                // keep only public, non-fork repositories and show up to six.

                const filteredRespositories =repositories
                .filter((repo)=>!repo.private && !repo.fork)
                .slice(0, 6);

                renderRepositories(filteredRespositories);

            } catch(repoError){
                if(repoError.name==="AbortError") return;

                repoGrid.replaceChildren(
                    createElement(
                        "div",
                        "rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-sm text-red-200 md:col-span-2 lg:col-span-3",
                        `Profile loaded, but respositories could not be fetched:${repoError.message}`
                    )
                );

                repoCount.textContent="Unavailable";
            }
            if(currentController===controller){
                resultsSection.scrollIntoView({
                    behavior:"smooth",
                    block:"start"
                });
            }
        } catch(error){
            if(error.name==="AbortError") return;
            if(currentController !==controller) return;
            resultsSection.classList.add("hidden");
            welcomeSection.classList.remove("hidden");

            const message=
                error instanceof TypeError
                    ?"Network error. Check your internet connection and try again."
                    :error.message;

            showStatus(message, "error");


        }finally{
            if(currentController===controller){
                setLoading(false);
                currentController=null;
            }
        }
        
    }

    // event listeners

    searchForm.addEventListener("submit", (event)=>{
        event.preventDefault();
        searchUser(usernameInput.value);
    });

    document.querySelectorAll("[data-username]").forEach((button)=> {
        button.addEventListener("click", ()=>{
            const username=button.dataset.username;
            usernameInput.value=username;
            searchUser(username);
        });
    });

searchUser("Abhishek30kush");




