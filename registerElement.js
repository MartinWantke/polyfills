//  @author: Martin Wantke                           //
//  @version: 1.0                                    //
//  @description: document.registerElement-polyfill  //
//  @license: CC0                                    //

if(!document.registerElement)
{
	let defaultCSS =
	{
		'font-stretch':  "100%",
		'line-height':  "normal",
		'orphans':  "2",
		'tab-size':  "8",
		'perspective-origin':  "0px 0px",
		'transform-origin':  "0px 0px"
	};
	

	let _documentLoaded = !!document.body;
	if(!_documentLoaded)
	{
		document.addEventListener("DOMContentLoaded", event => { _documentLoaded = true; });
	}
	
	
	function isCustomElement(element)
	{
		let registeredElements = window.____registeredElements;
		if(registeredElements === undefined || registeredElements === null || !registeredElements.constructor == Array) { return false; }
		
		let tagName = element.tagName.toLowerCase();
		
		for(let index = 0; index != registeredElements.length; index++)
		{
			let info = registeredElements[index];
			
			if(info.tagName == tagName)
			{
				return true;
			}
		}
		
		return false;
	}
	
	function isInDOM(child)
	{
		let current = child;

		while(current.parentNode !== null)
		{
			current = current.parentNode;
			if(current == document) { return true; }
		}
	
		return false;
	}
	
	
	function handleElementInserted(root)
	{
		function triggerAttachedHandler(node)
		{
			if(!(node instanceof Element)) { return; }
			
			let element = node;
			
			if(isCustomElement(element) && element.attachedCallback && element.attachedCallback.constructor == Function)
			{
				element.attachedCallback();
			}
		}
		
		function iterate(parent)
		{
			let nodes = parent.childNodes;
			
			for(let index = 0; index != nodes.length; index++)
			{
				let node = nodes[index];
				
				triggerAttachedHandler(node);
				iterate(node);
			}
		}
		
		if(isInDOM(root))
		{
			triggerAttachedHandler(root);
			iterate(root);
		}
	}
	
	function handleElementRemoved(element)
	{
		if(element.detachedCallback && element.detachedCallback.constructor == Function)
		{
			element.detachedCallback();
		}
	}
	
	
	detectLifecycleCallbacks()
	function detectLifecycleCallbacks()
	{
		if(Element.prototype.append)
		{
			Element.prototype.____append = Element.prototype.append;
			Element.prototype.append = function()
			{
				this.____append.apply(this, arguments);
				
				for(let index = 0; index != arguments.length; index++)
				{
					let arg = arguments[index];
					if(arg instanceof Element) { handleElementInserted(arg); }
				}
			}
		}
		
		if(Node.prototype.appendChild)
		{
			Node.prototype.____appendChild = Node.prototype.appendChild;
			Node.prototype.appendChild = function(node)
			{
				this.____appendChild(node);
				if(node instanceof Element) { handleElementInserted(node); }
			}
		}
		
		if(Node.prototype.insertBefore)
		{
			Node.prototype.____insertBefore = Node.prototype.insertBefore;
			Node.prototype.insertBefore = function(newNode, referenceNode)
			{
				this.____insertBefore.apply(this, arguments);
				if(newNode instanceof Element) { handleElementInserted(newNode); }
			};
		}
		
		if(Element.prototype.remove)
		{
			Element.prototype.____remove = Element.prototype.remove;
			Element.prototype.remove = function()
			{
				let inDOM = isInDOM(this);
			
				this.____remove();
				
				if(inDOM)
				{
					handleElementRemoved(this);
				}
			}
		}
		
		if(Element.prototype.removeChild)
		{
			Element.prototype.____removeChild = Element.prototype.removeChild;
			Element.prototype.removeChild = function(child)
			{
				let inDOM = isInDOM(child);
				
				this.____removeChild(child);
				
				if(inDOM)
				{
					handleElementRemoved(child);
				}
			}
		}
		
		if(Element.prototype.replaceChild)
		{
			Element.prototype.____replaceChild = Element.prototype.replaceChild;
			Element.prototype.replaceChild = function(newChild, oldChild)
			{
				let inDOM = isInDOM(this);
				
				this.____replaceChild(newChild, oldChild);
				
				if(inDOM)
				{
					handleElementRemoved(oldChild);
				}
				handleElementInserted(newChild);
			}
		}
	}
	
	
	let _rule = undefined;
	let _selectors = [];
	
	
	function buildCSS()
	{
		let cssText = "";
		let selectors = _selectors.length == 0 ? [":not(*)"] : _selectors;
		
		cssText += selectors.join(', ');
		
		cssText += "\n{\n";
		for(let name in defaultCSS)
		{
			let value = defaultCSS[name];
			cssText += "\t" + name + ": " + value + ";\n";
		}
		cssText += "}";
		
		return cssText;
	};
	
	function exchangeElement(registeredTagName)
	{
		let elements = document.querySelectorAll(registeredTagName);
		
		for(let indexElements = 0; indexElements != elements.length; indexElements++)
		{
			let element = elements[indexElements];
			
			let parent = element.parentNode;
			let nextSibling = element.nextSibling;
			
			
			let attributes = [];
			
			for(let index = 0; index != element.attributes.length; index++)
			{
				let attribute = element.attributes[index];
				
				attributes.push({ name: attribute.nodeName, value: attribute.nodeValue });
			}
			
			
			let childNodes = [];
			
			for(let index = 0; index != element.childNodes.length; index++)
			{
				childNodes.push(element.childNodes[index]);
			}
			
			for(let index = 0; index != childNodes.length; index++)
			{
				let node = childNodes[index];
				node.remove();
			}
			
			
			element.remove(); element = document.createElement(registeredTagName);
			
			for(let index = 0; index != attributes.length; index++)
			{
				let attribute = attributes[index];
				element.setAttribute(attribute.name, attribute.value);
			}
			
			for(let index = 0; index != childNodes.length; index++)
			{
				let child = childNodes[index];
				element.appendChild(child);
			}
			
			parent.insertBefore(element, nextSibling);
		}
	}
	
	function insertRuleFirst(cssText)
	{
		insertStyleSheetIfNecessary();
		
		let sheet = document.styleSheets[0];
		let rules = sheet.rules ? sheet.rules : sheet.cssRules;
		
		sheet.insertRule(cssText, 0);
		
		let rule = rules[0];
		
		return rule;
	}
	
	function insertStyleSheetIfNecessary()
	{
		let sheets = document.styleSheets;

		if(sheets.length == 0)
		{
			let style = document.createElement('style');
			style.appendChild(document.createTextNode(""));
			document.head.appendChild(style);
		}
	}
	
	function updateCSS()
	{
		insertStyleSheetIfNecessary();
		
		let sheet = document.styleSheets[0];
		let rules = sheet.rules ? sheet.rules : sheet.cssRules;
		
		
		if(_rule === undefined)
		{
			_rule = insertRuleFirst(buildCSS());
		}
		
		
		let isInList = !!_rule.parentStyleSheet;
		
		if(isInList)
		{
			let parent = _rule.parentStyleSheet;
			let list = parent.rules ? parent.rules : parent.cssRules;
			
			let rank = 0;
			for(; rank != list.length; index++)
			{
				if(list[rank] == _rule) { break; }
			}
			
			sheet.deleteRule(rank);
		}
		
		_rule = insertRuleFirst(buildCSS());
	}
	
	
	
	let createElement = document.createElement;
	document.____createElement = createElement;
	document.createElement = function(arg0, arg1)
	{
		//  (tagName)           //
		//  (extends, tagName)  //
		
		let tagName = undefined;
		let _extends = undefined;
		
		if(arguments.length == 1)
		{
			if(!!arg0 && arg0.constructor == String)
			{
				tagName = arg0;
			}
		}
		else if(arguments.length == 2)
		{
			if(!!arg0 && arg0.constructor == String && !!arg1 && arg1.constructor == String)
			{
				_extends = arg0;
				tagName = arg1;
			}
		}
	
		if(tagName === undefined) { throw new Error("Invalid argument."); }
		if(!window.____registeredElements || window.____registeredElements.constructor !== Array) { window.____registeredElements = []; }
	
		let registeredElements = window.____registeredElements;
	
		let registered = false, info = undefined;
		
		for(let index = 0; index != registeredElements.length; index++)
		{
			let item = registeredElements[index];
			
			if(item.tagName == tagName)
			{
				registered = true;
				info = item;
				
				break;
			}
		}
		
		let element = undefined;
		
		if(registered)
		{
			if(_extends)
			{
				element = createElement.call(document, _extends);
				element.setAttribute("is", tagName);
			}
			else
			{
				element = new info.constr();
			}
		}
		else
		{
			if(_extends)
			{
				element = createElement.call(document, _extends);
				element.setAttribute("is", tagName);
			}
			else
			{
				element = createElement.call(document, tagName);
			}
		}
		
		return element;
	}
	
	
	document.registerElement = function(tagNameToRegister, options)
	{
		if(tagNameToRegister === undefined || tagNameToRegister === null || tagNameToRegister.constructor !== String || !isValidExtendedTagName(tagNameToRegister)) { throw new DOMException("The type name is invalid."); }
		if(!window.____registeredElements || window.____registeredElements.constructor !== Array) { window.____registeredElements = []; }
		
		let registeredElements = window.____registeredElements;
		tagNameToRegister = tagNameToRegister.toLowerCase();
		
		
		for(let index = 0; index != registeredElements.length; index++)
		{
			let info = registeredElements[index];
			if(info.tagName === tagNameToRegister) { throw new DOMException("A type with that name is already registered."); }
		}
		
		
		function isValidExtendedTagName(name)
		{
			if(name === undefined || name === null || name.constructor !== String) { return true; }
			
			let countMinusSign = 0;
			
			for(let index = 0; index != name.length; index++)
			{
				let character = name[index];
				
				if(character == "-")
				{
					countMinusSign++;
					continue;
				}
				
				if((character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z'))
				{
					continue;
				}
			}
			
			if(countMinusSign == 0) { return false; }
			return true;
		}
		
		function isValidTagName(name)
		{
			return name.search("[^a-zA-Z\-]") == -1;
		}
		
		
		options = options || {};
		let proto = options.prototype && options.prototype instanceof HTMLElement ? options.prototype : undefined;
		
		_selectors.push(tagNameToRegister); updateCSS();
		
		let constructorFunction = undefined;
		
		
		function triggerAttributeChanged(element)
		{
			element.____setAttribute = element.setAttribute;
			element.setAttribute = function(name, value)
			{
				let storedValue = element.getAttribute(name);
				element.____setAttribute(name, value);
				
				if(element.attributeChangedCallback && element.attributeChangedCallback.constructor == Function)
				{
					element.attributeChangedCallback(name, storedValue, value);
				}
			};
			
			["accessKey", "className", "draggable", "hidden", "id", "lang", "slot", "tabIndex", "title"].forEach(attributeName =>
			{
				let defaultValue = element[attributeName];
				
				Object.defineProperty(element, attributeName,
				{
					get: function()
					{
						let value = this.getAttribute(attributeName);
						return value == null ? defaultValue : value;
					},
					set: function(value)
					{
						this.setAttribute(attributeName, value);
					}
				});
			});
		}
		
		function basicElementConstructor(element)
		{	
			if(proto !== undefined)
			{
				Object.setPrototypeOf(element, proto);
			}
			
			if(!!element.createdCallback && element.createdCallback.constructor == Function)
			{
				element.createdCallback();
			}
			
			triggerAttributeChanged(element);
		};
		
		
		if(options.extends && options.extends.constructor == String && isValidTagName(options.extends))
		{
			let tagName = options.extends;
			
			constructorFunction = (function()
			{
				let element = createElement.call(document, tagName);
				element.setAttribute("is", tagNameToRegister);
				
				basicElementConstructor.call(this, element);
				
				return element;
			});
		}
		else
		{
			constructorFunction = (function()
			{
				let element = createElement.call(document, tagNameToRegister);
				basicElementConstructor.call(this, element);
				return element;
			});
		}
		
		registeredElements.push({ tagName: tagNameToRegister, constr: constructorFunction });
		
		if(proto !== undefined)
		{
			if(_documentLoaded)
			{
				exchangeElement(tagNameToRegister);
			}
			else
			{
				document.addEventListener("DOMContentLoaded", event => { exchangeElement(tagNameToRegister); });
			}
		}
		
		return constructorFunction;
	}
}